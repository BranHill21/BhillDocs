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
    documentId: string;
    fileName?: string;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({ provider, documentId, fileName }) => {
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
        a.download = `${fileName || documentId}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!editor) {
        return <div className="flex justify-center items-center h-screen">Loading editor...</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Toolbar */}
            <div className="bg-white border-b px-4 py-2 flex space-x-2 justify-between items-center">
                {/* Left side: Formatting */}
                <div className="flex space-x-2">
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

                {/* Right side: Export */}
                <div className="flex space-x-2">
                    <button onClick={() => handleExport('txt')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">Export TXT</button>
                    <button onClick={() => handleExport('html')} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm">Export HTML</button>
                </div>
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
    const [ydocState, setYDocState] = useState<Y.Doc | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [docTitle, setDocTitle] = useState('');
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

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
        setYDocState(ydoc);

        // Status
        const updateStatus = (event: any) => {
            setStatus(event.status);
        };
        wsProvider.on('status', updateStatus);

        // Sync Title
        const metaMap = ydoc.getMap('meta');

        const updateTitle = () => {
            const remoteTitle = metaMap.get('title') as string;
            // Only default to 'Untitled Document' if strictly undefined, allow empty string
            setDocTitle(remoteTitle !== undefined ? remoteTitle : 'Untitled Document');
        };

        metaMap.observe((event) => {
            if (event.keysChanged.has('title')) {
                updateTitle();
            }
        });

        // Initial title fetch (wait for sync)
        wsProvider.on('sync', (isSynced: boolean) => {
            if (isSynced) {
                updateTitle();
            }
        });

        return () => {
            wsProvider.off('status', updateStatus);
            wsProvider.destroy();
            ydoc.destroy();
        };
    }, [documentId, isAuthenticated]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDocTitle(e.target.value);
    };

    const handleTitleBlur = () => {
        if (ydocState) {
            const titleToSave = docTitle.trim() === '' ? 'Untitled Document' : docTitle;
            // Optimistically update local state to match what we saved (if we enforced a default)
            setDocTitle(titleToSave);
            ydocState.getMap('meta').set('title', titleToSave);
        }
    };

    // Allow pressing enter to commit title
    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    if (!documentId) return null;

    if (!isAuthenticated) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!provider) {
        return <div className="flex justify-center items-center h-screen">Connecting to collaboration server...</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Title Bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center space-x-4 flex-1">
                    <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700 font-medium">
                        &larr; Back
                    </button>
                    <input
                        type="text"
                        value={docTitle}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        className="text-xl font-bold text-gray-800 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none px-2 py-1 transition w-full max-w-md"
                        placeholder="Untitled Document"
                    />
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {status === 'connected' ? 'Online' : 'Offline'}
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden relative">
                <TiptapEditor
                    provider={provider}
                    documentId={documentId}
                    fileName={docTitle} // Pass title for download
                />
            </div>
        </div>
    );
};
