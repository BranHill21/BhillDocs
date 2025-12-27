import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { joinDocument } from '../api';

const COLORS = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D'];

// Custom Font Size Extension
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (size: string) => ReturnType;
            unsetFontSize: () => ReturnType;
        };
    }
}

const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) => element.style.fontSize?.replace('px', ''),
                        renderHTML: (attributes) => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}px`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize: (fontSize) => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run();
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run();
            },
        };
    },
});

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
            Placeholder.configure({
                placeholder: 'Write something amazing...',
            }),
            Underline,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Link.configure({
                openOnClick: false,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Highlight,
            TextStyle,
            FontFamily,
            FontSize,
        ],
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none h-full p-8 bg-white shadow-lg min-h-[800px]',
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

    const setLink = () => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    if (!editor) {
        return <div className="flex justify-center items-center h-screen">Loading editor...</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 shadow-sm z-20 flex flex-wrap gap-2 sticky top-0">
                {/* 1. Typography: Font Family & Size */}
                <div className="flex items-center space-x-1 border-r border-gray-200 pr-2 mr-1">
                    <select
                        className="border border-gray-200 rounded text-sm p-1 w-24"
                        onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                        value={editor.getAttributes('textStyle').fontFamily || ''}
                    >
                        <option value="">Default</option>
                        <option value="Inter">Inter</option>
                        <option value="serif">Serif</option>
                        <option value="monospace">Mono</option>
                        <option value="Comic Sans MS, Comic Sans">Comic</option>
                    </select>
                    <select
                        className="border border-gray-200 rounded text-sm p-1 w-16"
                        onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
                        value={editor.getAttributes('textStyle').fontSize || ''}
                    >
                        <option value="">Size</option>
                        <option value="12">12</option>
                        <option value="14">14</option>
                        <option value="16">16</option>
                        <option value="20">20</option>
                        <option value="24">24</option>
                        <option value="32">32</option>
                    </select>
                </div>

                {/* 2. Text Style */}
                <div className="flex items-center space-x-1 border-r border-gray-200 pr-2 mr-1">
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-gray-200 text-black' : 'text-gray-600 hover:bg-gray-100'}`} title="Bold"><strong>B</strong></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-gray-200 text-black' : 'text-gray-600 hover:bg-gray-100'}`} title="Italic"><em>I</em></button>
                    <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded ${editor.isActive('underline') ? 'bg-gray-200 text-black' : 'text-gray-600 hover:bg-gray-100'}`} title="Underline"><u>U</u></button>
                    <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded ${editor.isActive('strike') ? 'bg-gray-200 text-black' : 'text-gray-600 hover:bg-gray-100'}`} title="Strike"><del>S</del></button>
                    <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={`p-1.5 rounded ${editor.isActive('highlight') ? 'bg-yellow-200 text-black' : 'text-gray-600 hover:bg-gray-100'}`} title="Highlight">H</button>
                </div>

                {/* 3. Headings & Logic */}
                <div className="flex items-center space-x-1 border-r border-gray-200 pr-2 mr-1">
                    <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded text-sm font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-black' : 'text-gray-600 hover:bg-gray-100'}`}>H1</button>
                    <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded text-sm font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-black' : 'text-gray-600 hover:bg-gray-100'}`}>H2</button>
                    <button onClick={() => editor.chain().focus().setParagraph().run()} className={`p-1.5 rounded text-sm ${editor.isActive('paragraph') ? 'bg-gray-200 text-black' : 'text-gray-600 hover:bg-gray-100'}`}>P</button>
                </div>

                {/* 4. Alignment */}
                <div className="flex items-center space-x-1 border-r border-gray-200 pr-2 mr-1">
                    <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>Left</button>
                    <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>Center</button>
                    <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-1.5 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>Right</button>
                </div>

                {/* 5. Lists via emoji icons or text */}
                <div className="flex items-center space-x-1 border-r border-gray-200 pr-2 mr-1">
                    <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>• List</button>
                    <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>1. List</button>
                    <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded ${editor.isActive('taskList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>Task</button>
                </div>

                {/* 6. Insert */}
                <div className="flex items-center space-x-1 border-r border-gray-200 pr-2 mr-1">
                    <button onClick={setLink} className={`p-1.5 rounded ${editor.isActive('link') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>Link</button>
                    <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-1.5 rounded ${editor.isActive('blockquote') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>""</button>
                </div>

                {/* 7. Export */}
                <div className="flex items-center space-x-1 ml-auto">
                    <button onClick={() => handleExport('txt')} className="px-2 py-1 bg-gray-50 rounded border hover:bg-gray-100 text-xs text-gray-700">TXT</button>
                    <button onClick={() => handleExport('html')} className="px-2 py-1 bg-gray-50 rounded border hover:bg-gray-100 text-xs text-gray-700">HTML</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-100 p-8" onClick={() => editor.chain().focus().run()}>
                <div className="max-w-4xl mx-auto min-h-[800px] bg-white shadow-xl rounded-lg overflow-hidden">
                    <EditorContent editor={editor} className="h-full p-8" />
                </div>
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
