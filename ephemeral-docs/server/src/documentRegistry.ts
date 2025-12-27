import { WebSocket } from 'ws';
import * as Y from 'yjs';

export interface DocumentSession {
    id: string;
    ydoc: Y.Doc;
    isPublic: boolean;
    passwordHash?: string;
    lastUpdated: number;
    connections: Set<WebSocket>;
}

// In-memory store
export const documents = new Map<string, DocumentSession>();

const send = (ws: WebSocket, message: Uint8Array) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
    }
};

export const createDocument = (
    id: string,
    isPublic: boolean = true,
    passwordHash?: string
): DocumentSession => {
    const doc = new Y.Doc();

    const session: DocumentSession = {
        id,
        ydoc: doc,
        isPublic,
        passwordHash,
        lastUpdated: Date.now(),
        connections: new Set(),
    };

    // Register update handler for broadcasting
    doc.on('update', (update: Uint8Array, origin: any) => {
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

export const getDocument = (id: string): DocumentSession | undefined => {
    return documents.get(id);
};

export const getPublicDocuments = () => {
    const publicDocs: { id: string; userCount: number; lastUpdated: number }[] = [];

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

export const deleteDocument = (id: string) => {
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
