import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatInterface.css';
import SourcesDisplay from './SourcesDisplay';

const API_BASE_URL = 'http://localhost:8000';

interface Source {
  document_name: string;
  page_number: number;
  preview: string;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

interface ChatInterfaceProps {
  documentId: string;
}

function ChatInterface({ documentId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: 'user',
        content: userMessage,
      },
    ]);

    try {
      const response = await axios.post<{ answer: string; sources: Source[] }>(
        `${API_BASE_URL}/chat`,
        {
          question: userMessage,
          document_id: documentId,
        }
      );

      // Add assistant message with sources from backend
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.data.answer,  // This displays the backend's answer
          sources: response.data.sources,
        },
      ]);
    } catch (err) {
      setError('Failed to get response. Please try again.');
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Start Asking Questions</h3>
            <p>Ask anything about your uploaded document</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message message-${message.role}`}
          >
            <div className="message-content">
              <p>{message.content}</p>
            </div>
            {message.sources && message.sources.length > 0 && (
              <SourcesDisplay sources={message.sources} />
            )}
          </div>
        ))}

        {loading && (
          <div className="message message-assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your document..."
          disabled={loading}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="send-btn"
        >
          {loading ? '...' : '→'}
        </button>
      </form>
    </div>
  );
}

export default ChatInterface;
