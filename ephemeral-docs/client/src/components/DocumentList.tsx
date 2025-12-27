import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDocuments, createDocument } from '../api';
import type { DocumentMetadata } from '../types';

export const DocumentList: React.FC = () => {
    const navigate = useNavigate();
    const [docs, setDocs] = useState<DocumentMetadata[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        fetchDocuments().then(setDocs).catch(console.error);
        const interval = setInterval(() => {
            setRefreshTrigger(n => n + 1);
        }, 5000); // Auto refresh list
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { id } = await createDocument(!isPrivate, password);
            navigate(`/doc/${id}`);
        } catch (err) {
            console.error(err);
            alert('Failed to create document');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Ephemeral Docs</h1>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
                >
                    {isCreating ? 'Cancel' : 'New Document'}
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreate} className="bg-white p-6 rounded shadow-lg mb-8 border border-gray-200">
                    <h2 className="text-xl font-semibold mb-4">Create New Document</h2>
                    <div className="mb-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="form-checkbox h-5 w-5 text-blue-600"
                            />
                            <span>Private (Password Protected)</span>
                        </label>
                    </div>
                    {isPrivate && (
                        <div className="mb-4">
                            <label className="block text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                    )}
                    <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
                        Create & Join
                    </button>
                </form>
            )}

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {docs.length === 0 ? (
                    <p className="text-gray-500 col-span-3 text-center py-10 text-lg">No active public documents found. Create one above!</p>
                ) : (
                    docs.map(doc => (
                        <div key={doc.id} className="bg-white p-5 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 flex flex-col justify-between group">
                            <div className="mb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-xl text-gray-800 leading-tight line-clamp-2" title={doc.title}>
                                        {doc.title || 'Untitled Document'}
                                    </h3>
                                    <span className="flex items-center text-xs font-semibold bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-100 shrink-0 ml-2">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                                        {doc.userCount}
                                    </span>
                                </div>
                                <p className="font-mono text-xs text-gray-400 mb-3" title={doc.id}>
                                    ID: <span className="bg-gray-50 px-1 py-0.5 rounded text-gray-500">{doc.id.slice(0, 8)}</span>
                                </p>
                            </div>

                            <div className="pt-4 border-t border-gray-50">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs text-gray-400">Updated {new Date(doc.lastUpdated).toLocaleTimeString()}</span>
                                </div>
                                <button
                                    onClick={() => navigate(`/doc/${doc.id}`)}
                                    className="w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white py-2.5 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center group-hover:shadow-md"
                                >
                                    Join Document
                                    <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">&rarr;</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
