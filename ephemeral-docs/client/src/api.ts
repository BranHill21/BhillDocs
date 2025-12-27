import type { DocumentMetadata, CreateDocumentResponse } from './types';

const API_BASE = 'http://localhost:3000/api';

export const fetchDocuments = async (): Promise<DocumentMetadata[]> => {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
};

export const createDocument = async (isPublic: boolean, password?: string): Promise<CreateDocumentResponse> => {
    const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic, password }),
    });
    if (!res.ok) throw new Error('Failed to create document');
    return res.json();
};

export const joinDocument = async (id: string, password?: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/documents/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    });
    if (res.status === 401) return false;
    if (!res.ok) throw new Error('Failed to join document');
    return true; // Success or public
};
