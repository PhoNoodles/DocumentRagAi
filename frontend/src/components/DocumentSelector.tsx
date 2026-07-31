import type { DocumentRecord } from '../types';
import './DocumentSelector.css';

interface DocumentSelectorProps {
  documents: DocumentRecord[];
  loading: boolean;
  error: string | null;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onStartChat: () => void;
  onRequestDelete?: (doc: DocumentRecord) => void;
  deletingDocumentIds?: Set<string>;
  deleteErrors?: Record<string, string>;
}

function DocumentSelector({
  documents,
  loading,
  error,
  selectedIds,
  onToggle,
  onStartChat,
  onRequestDelete,
  deletingDocumentIds,
  deleteErrors,
}: DocumentSelectorProps) {
  const canStart = selectedIds.length > 0;

  return (
    <div className="document-selector">
      <h2>Choose Documents to Chat With</h2>
      <p className="document-selector-subtitle">
        Only completed documents can be selected. Processing and failed documents are shown but disabled.
      </p>

      {loading && <div className="document-list-message">Loading documents...</div>}
      {error && <div className="document-list-message error">{error}</div>}

      {!loading && !error && documents.length === 0 && (
        <div className="document-list-message">
          No documents yet. Upload a PDF from the Upload Documents tab first.
        </div>
      )}

      {!loading && !error && documents.length > 0 && (
        <ul className="selector-list">
          {documents.map((doc) => {
            const disabled = doc.status !== 'completed';
            const checked = selectedIds.includes(doc.id);
            const isDeleting = deletingDocumentIds?.has(doc.id) ?? false;
            const isProcessing = doc.status === 'processing';
            const deleteError = deleteErrors?.[doc.id];
            return (
              <li
                key={doc.id}
                className={`selector-item${disabled ? ' disabled' : ''}${checked ? ' checked' : ''}`}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(doc.id)}
                  />
                  <div className="selector-item-info">
                    <span className="document-filename">{doc.filename}</span>
                    <span className={`status-badge status-${doc.status}`}>{doc.status}</span>
                  </div>
                </label>
                {onRequestDelete && (
                  <div className="selector-item-footer">
                    <button
                      type="button"
                      className="delete-btn"
                      aria-label={`Delete ${doc.filename}`}
                      title={isProcessing ? 'Documents that are still processing cannot be deleted yet.' : undefined}
                      onClick={() => onRequestDelete(doc)}
                      disabled={isDeleting || isProcessing}
                    >
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                    {deleteError && (
                      <span className="document-list-item-error" role="alert">
                        {deleteError}{' '}
                        <button type="button" className="retry-delete-btn" onClick={() => onRequestDelete(doc)}>
                          Retry
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="selector-footer">
        <span className="selection-count">
          {selectedIds.length} document{selectedIds.length === 1 ? '' : 's'} selected
        </span>
        <button className="start-chat-btn" disabled={!canStart} onClick={onStartChat}>
          Start Chat
        </button>
      </div>
    </div>
  );
}

export default DocumentSelector;
