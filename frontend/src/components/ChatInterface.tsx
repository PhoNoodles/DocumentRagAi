import { useEffect, useRef, useState, type FormEvent } from 'react';
import './ChatInterface.css';
import SourcesDisplay from './SourcesDisplay';
import { askQuestion, createMessageId, getErrorMessage } from '../api';
import type { ChatMessage } from '../types';

interface ChatInterfaceProps {
  documentIds: string[];
}

function ChatInterface({ documentIds }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendQuestion = async (question: string) => {
    setLoading(true);
    setError(null);

    const userMessageId = createMessageId();
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        content: question,
      },
    ]);

    try {
      const result = await askQuestion(question, documentIds);

      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
        },
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to get response. Please try again.'));
      setInput(question);
      setMessages((prev) => prev.filter((m) => m.id !== userMessageId));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    sendQuestion(question);
  };

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Start Asking Questions</h3>
            <p>Ask anything about your selected documents</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.role}`}>
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

        {error && <div className="error-banner">⚠️ {error}</div>}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your selected documents..."
          disabled={loading}
          className="chat-input"
        />
        <button type="submit" disabled={loading || !input.trim()} className="send-btn">
          {loading ? '...' : '→'}
        </button>
      </form>
    </div>
  );
}

export default ChatInterface;
