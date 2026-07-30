import { useState } from 'react';
import './App.css';
import UploadPanel from './components/UploadPanel';
import ChatPanel from './components/ChatPanel';

type Tab = 'upload' | 'chat';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');

  return (
    <div className="App">
      <header className="app-header">
        <h1>📄 DocuMind AI</h1>
        <p>Ask questions about your documents</p>
      </header>

      <nav className="tab-nav">
        <button
          className={`tab-btn${activeTab === 'upload' ? ' active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Documents
        </button>
        <button
          className={`tab-btn${activeTab === 'chat' ? ' active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
      </nav>

      <main className="app-main">
        <div className="container">
          {activeTab === 'upload' ? <UploadPanel /> : <ChatPanel />}
        </div>
      </main>
    </div>
  );
}

export default App;
