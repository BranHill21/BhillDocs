export interface DocumentMetadata {
    id: string;
    title: string;
    userCount: number;
    lastUpdated: number;
}

export interface CreateDocumentResponse {
    id: string;
    isPublic: boolean;
}
