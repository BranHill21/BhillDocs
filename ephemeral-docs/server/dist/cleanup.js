import { documents, deleteDocument } from './documentRegistry.js';
const CLEANUP_INTERVAL_MS = 60 * 1000; // Run every minute
const MAX_IDLE_TIME_MS = 60 * 60 * 1000; // 1 hour
export const startCleanupJob = () => {
    setInterval(() => {
        const now = Date.now();
        let deletedCount = 0;
        documents.forEach((doc, id) => {
            if (now - doc.lastUpdated > MAX_IDLE_TIME_MS) {
                console.log(`[Cleanup] Removing stale document: ${id}`);
                deleteDocument(id);
                deletedCount++;
            }
        });
        if (deletedCount > 0) {
            console.log(`[Cleanup] Removed ${deletedCount} document(s).`);
        }
    }, CLEANUP_INTERVAL_MS);
};
