import { Routes, Route } from 'react-router-dom';
import { DocumentList } from './components/DocumentList';
import { Editor } from './components/Editor';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Routes>
        <Route path="/" element={<DocumentList />} />
        <Route path="/doc/:id" element={<Editor />} />
      </Routes>
    </div>
  );
}

export default App;
