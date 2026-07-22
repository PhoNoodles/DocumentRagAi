import React, { useState } from 'react';
import './App.css';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';

function App() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);

  const handleDocumentUploaded = (id: string, filename: string) => {
    setDocumentId(id);
    setDocumentName(filename);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>📄 DocuMind AI</h1>
        <p>Ask questions about your documents</p>
      </header>

      <main className="app-main">
        <div className="container">
          {!documentId ? (
            <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
          ) : (
            <div className="chat-container">
              <div className="document-info">
                <span className="badge">✓ Document Loaded</span>
                <h2>{documentName}</h2>
              </div>
              <ChatInterface documentId={documentId} />
              <button
                className="btn-reset"
                onClick={() => {
                  setDocumentId(null);
                  setDocumentName(null);
                }}
              >
                Upload Different Document
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
