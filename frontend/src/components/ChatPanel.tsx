import { useEffect, useState } from 'react';
import { fetchDocuments, getErrorMessage } from '../api';
import { useDocumentDeletion } from '../hooks/useDocumentDeletion';
import type { DocumentRecord } from '../types';
import DocumentSelector from './DocumentSelector';
import ChatInterface from './ChatInterface';
import DeleteDocumentDialog from './DeleteDocumentDialog';
import './ChatPanel.css';

function ChatPanel() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDocumentIds, setActiveDocumentIds] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchDocuments()
      .then((docs) => {
        if (!cancelled) setDocuments(docs);
      })
      .catch((err) => {
        if (!cancelled) setDocumentsError(getErrorMessage(err, 'Failed to load documents.'));
      })
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDocumentDeleted = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    setSelectedIds((prev) => prev.filter((id) => id !== documentId));
    setActiveDocumentIds((prev) => {
      if (!prev || !prev.includes(documentId)) return prev;
      const next = prev.filter((id) => id !== documentId);
      return next.length > 0 ? next : null;
    });
  };

  const { target, deletingIds, errors, requestDelete, cancelDelete, confirmDelete } =
    useDocumentDeletion(handleDocumentDeleted);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]
    );
  };

  const handleStartChat = () => {
    if (selectedIds.length === 0) return;
    setActiveDocumentIds(selectedIds);
  };

  const handleChangeSelection = () => {
    setActiveDocumentIds(null);
  };

  if (activeDocumentIds) {
    const activeDocuments = documents.filter((doc) => activeDocumentIds.includes(doc.id));

    return (
      <div className="chat-panel">
        <div className="chat-scope-bar">
          <div className="chat-scope-info">
            <span className="chat-scope-label">Chatting with:</span>
            <div className="chat-scope-chips">
              {activeDocuments.map((doc) => (
                <span key={doc.id} className="chat-scope-chip">
                  {doc.filename}
                </span>
              ))}
            </div>
          </div>
          <button className="change-selection-btn" onClick={handleChangeSelection}>
            Change Documents
          </button>
        </div>
        <ChatInterface
          key={activeDocumentIds.slice().sort().join(',')}
          documentIds={activeDocumentIds}
        />
      </div>
    );
  }

  return (
    <>
      <DocumentSelector
        documents={documents}
        loading={documentsLoading}
        error={documentsError}
        selectedIds={selectedIds}
        onToggle={toggleSelection}
        onStartChat={handleStartChat}
        onRequestDelete={requestDelete}
        deletingDocumentIds={deletingIds}
        deleteErrors={errors}
      />
      {target && (
        <DeleteDocumentDialog
          targetDocument={target}
          deleting={deletingIds.has(target.id)}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}

export default ChatPanel;
