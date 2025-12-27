export interface DocumentMetadata {
    id: string;
    userCount: number;
    lastUpdated: number;
}

export interface CreateDocumentResponse {
    id: string;
    isPublic: boolean;
}
