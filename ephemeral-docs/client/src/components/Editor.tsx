import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { joinDocument } from '../api';

const COLORS = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D'];

interface TiptapEditorProps {
    provider: WebsocketProvider;
    onLeave: () => void;
    documentId: string;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({ provider, onLeave, documentId }) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    useEffect(() => {
        const updateStatus = (event: any) => {
            setStatus(event.status);
        };
        provider.on('status', updateStatus);
        return () => {
            provider.off('status', updateStatus);
        };
    }, [provider]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                history: false, // handled by Yjs
            }),
            Collaboration.configure({
                document: provider.doc,
            }),
            CollaborationCursor.configure({
                provider: provider,
                user: {
                    name: 'User ' + Math.floor(Math.random() * 100),
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                },
            }),
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none h-full p-4',
            },
        },
    });

    const handleExport = (format: 'txt' | 'html' | 'json') => {
        if (!editor) return;
        let content = '';
        let mime = 'text/plain';
        let ext = 'txt';

        if (format === 'html') {
            content = editor.getHTML();
            mime = 'text/html';
            ext = 'html';
        } else if (format === 'json') {
            content = JSON.stringify(editor.getJSON(), null, 2);
            mime = 'application/json';
            ext = 'json';
        } else {
            content = editor.getText();
        }

        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-${documentId}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!editor) {
        return <div className="flex justify-center items-center h-screen">Loading editor...</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <div className="bg-white border-b px-4 py-2 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center space-x-4">
                    <button onClick={onLeave} className="text-gray-500 hover:text-gray-800">← Back</button>
                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">Document Editor</span>
                        <span className={`text-xs ${status === 'connected' ? 'text-green-500' : 'text-red-500'}`}>
                            {status === 'connected' ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button onClick={() => handleExport('txt')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">Export TXT</button>
                    <button onClick={() => handleExport('html')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">Export HTML</button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white border-b px-4 py-2 flex space-x-2 justify-center">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`px-3 py-1 rounded ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                    Bold
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`px-3 py-1 rounded ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                    Italic
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`px-3 py-1 rounded ${editor.isActive('strike') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                    Strike
                </button>
            </div>

            <div className="flex-1 overflow-auto p-8 cursor-text" onClick={() => editor.chain().focus().run()}>
                <EditorContent editor={editor} className="min-h-[500px] bg-white shadow-lg max-w-4xl mx-auto rounded-lg" />
            </div>
        </div>
    );
};

interface EditorRouteParams extends Record<string, string> {
    id: string;
}

export const Editor: React.FC = () => {
    const { id } = useParams<EditorRouteParams>();
    const navigate = useNavigate();
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // If no ID is present, go back home
    useEffect(() => {
        if (!id) {
            navigate('/');
        }
    }, [id, navigate]);

    const documentId = id || '';

    // Authenticate first
    useEffect(() => {
        if (!documentId) return;

        let isMounted = true;
        // Check if public or needs password
        joinDocument(documentId).then(success => {
            if (!isMounted) return;
            if (success) {
                setIsAuthenticated(true);
            } else {
                // Needs password
                const pwd = prompt('Enter password for this document:');
                if (pwd) {
                    joinDocument(documentId, pwd).then(ok => {
                        if (!isMounted) return;
                        if (ok) setIsAuthenticated(true);
                        else {
                            alert('Incorrect password');
                            navigate('/');
                        }
                    }).catch(() => {
                        alert('Error joining');
                        navigate('/');
                    });
                } else {
                    navigate('/');
                }
            }
        }).catch(err => {
            console.error(err);
            alert('Document not found or error');
            navigate('/');
        });
        return () => { isMounted = false; };
    }, [documentId, navigate]);

    // Connect to Yjs
    useEffect(() => {
        if (!isAuthenticated || !documentId) return;

        const ydoc = new Y.Doc();
        const wsProvider = new WebsocketProvider('ws://localhost:3000', documentId, ydoc);

        setProvider(wsProvider);

        return () => {
            wsProvider.destroy();
            ydoc.destroy();
        };
    }, [documentId, isAuthenticated]);

    if (!documentId) return null;

    if (!isAuthenticated) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!provider) {
        return <div className="flex justify-center items-center h-screen">Connecting to collaboration server...</div>;
    }

    return <TiptapEditor provider={provider} onLeave={() => navigate('/')} documentId={documentId} />;
};
