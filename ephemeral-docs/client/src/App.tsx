import { useState } from 'react';
import { DocumentList } from './components/DocumentList';
import { Editor } from './components/Editor';

function App() {
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {currentDocId ? (
        <Editor
          documentId={currentDocId}
          onLeave={() => setCurrentDocId(null)}
        />
      ) : (
        <DocumentList onJoin={setCurrentDocId} />
      )}
    </div>
  );
}

export default App;
