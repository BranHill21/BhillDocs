import { WebSocket } from 'ws';
import * as Y from 'yjs';
// In-memory store
export const documents = new Map();
const send = (ws, message) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
    }
};
export const createDocument = (id, isPublic = true, passwordHash) => {
    const doc = new Y.Doc();
    const session = {
        id,
        ydoc: doc,
        isPublic,
        passwordHash,
        lastUpdated: Date.now(),
        connections: new Set(),
    };
    // Register update handler for broadcasting
    doc.on('update', (update, origin) => {
        session.lastUpdated = Date.now();
        const message = new Uint8Array(update.length + 2);
        message[0] = 0; // Sync
        message[1] = 2; // Update
        message.set(update, 2);
        session.connections.forEach((ws) => {
            if (ws !== origin) {
                send(ws, message);
            }
        });
    });
    documents.set(id, session);
    return session;
};
export const getDocument = (id) => {
    return documents.get(id);
};
export const getPublicDocuments = () => {
    const publicDocs = [];
    documents.forEach((doc) => {
        if (doc.isPublic) {
            publicDocs.push({
                id: doc.id,
                userCount: doc.connections.size,
                lastUpdated: doc.lastUpdated,
            });
        }
    });
    return publicDocs;
};
export const deleteDocument = (id) => {
    const doc = documents.get(id);
    if (doc) {
        // Close all connections
        doc.connections.forEach((ws) => {
            ws.close();
        });
        doc.ydoc.destroy();
        documents.delete(id);
    }
};
