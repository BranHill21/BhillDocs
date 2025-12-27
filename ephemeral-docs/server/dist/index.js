import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { createDocument, getDocument, getPublicDocuments } from './documentRegistry.js';
import { startCleanupJob } from './cleanup.js';
const app = express();
const port = 3000;
app.use(express.json());
// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
});
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
// --- REST API ---
app.get('/api/documents', (req, res) => {
    res.json(getPublicDocuments());
});
app.post('/api/documents', async (req, res) => {
    try {
        const { isPublic, password } = req.body;
        const id = uuidv4();
        let passwordHash;
        if (isPublic === false && password) {
            passwordHash = await bcrypt.hash(password, 10);
        }
        createDocument(id, isPublic !== false, passwordHash);
        res.json({ id, isPublic: isPublic !== false });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/api/documents/:id/join', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const doc = getDocument(id);
    if (!doc) {
        res.status(404).json({ error: 'Document not found' });
        return;
    }
    if (doc.isPublic) {
        res.json({ success: true });
        return;
    }
    if (doc.passwordHash && password) {
        const match = await bcrypt.compare(password, doc.passwordHash);
        if (match) {
            res.json({ success: true });
        }
        else {
            res.status(401).json({ error: 'Invalid password' });
        }
    }
    else {
        res.status(401).json({ error: 'Password required' });
    }
});
// --- WebSocket Logic ---
const send = (ws, message) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
    }
};
const setupWS = (ws, req) => {
    const url = req.url;
    if (!url) {
        ws.close();
        return;
    }
    // URL format: /ws/<docId> or just /<docId> depending on how client connects
    // We'll assume client connects to ws://host/docId
    const docId = url.replace(/^\//, '');
    const session = getDocument(docId);
    if (!session) {
        ws.close(1008, 'Document not found');
        return;
    }
    session.connections.add(ws);
    session.lastUpdated = Date.now();
    ws.on('message', (message) => {
        try {
            // message is Buffer (in ws)
            const buffer = new Uint8Array(message);
            const decoder = decoding.createDecoder(buffer);
            const messageType = decoding.readVarUint(decoder);
            // Minimal implementation of y-protocol
            // https://github.com/yjs/y-websocket/blob/master/path/to/protocol.js
            if (messageType === 0) { // Sync
                const messageTypeStep = decoding.readVarUint(decoder);
                if (messageTypeStep === 0) { // SyncStep1: Client requests sync
                    // Client sends their StateVector
                    const encodedSV = decoding.readVarUint8Array(decoder);
                    // Server responds with SyncStep2: Diff(ClientSV, ServerDoc)
                    const update = Y.encodeStateAsUpdate(session.ydoc, encodedSV);
                    const replyEncoder = encoding.createEncoder();
                    encoding.writeVarUint(replyEncoder, 0); // Sync
                    encoding.writeVarUint(replyEncoder, 1); // SyncStep2
                    encoding.writeVarUint8Array(replyEncoder, update);
                    send(ws, encoding.toUint8Array(replyEncoder));
                }
                else if (messageTypeStep === 1 || messageTypeStep === 2) { // SyncStep2 or Update from client
                    const update = decoding.readVarUint8Array(decoder);
                    // Apply update to server doc. 
                    Y.applyUpdate(session.ydoc, update, ws);
                }
            }
            else if (messageType === 1) { // Awareness
                // Broadcast awareness to others transparently
                const awarenessUpdate = decoding.readVarUint8Array(decoder);
                session.connections.forEach(c => {
                    if (c !== ws) {
                        const replyEncoder = encoding.createEncoder();
                        encoding.writeVarUint(replyEncoder, 1); // Awareness
                        encoding.writeVarUint8Array(replyEncoder, awarenessUpdate);
                        send(c, encoding.toUint8Array(replyEncoder));
                    }
                });
            }
        }
        catch (err) {
            console.error('[WS Error] Failed to process message:', err);
        }
    });
    ws.on('close', () => {
        session.connections.delete(ws);
    });
};
wss.on('connection', setupWS);
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    startCleanupJob();
});
