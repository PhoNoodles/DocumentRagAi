import type { DocumentRecord } from '../types';
import './DocumentList.css';

interface DocumentListProps {
  documents: DocumentRecord[];
  loading: boolean;
  error: string | null;
  onRequestDelete?: (doc: DocumentRecord) => void;
  deletingDocumentIds?: Set<string>;
  deleteErrors?: Record<string, string>;
}

function formatDate(value: string | null): string {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString();
}

function StatusBadge({ status }: { status: DocumentRecord['status'] }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

function DocumentList({
  documents,
  loading,
  error,
  onRequestDelete,
  deletingDocumentIds,
  deleteErrors,
}: DocumentListProps) {
  if (loading) {
    return <div className="document-list-message">Loading documents...</div>;
  }

  if (error) {
    return <div className="document-list-message error">{error}</div>;
  }

  if (documents.length === 0) {
    return <div className="document-list-message">No documents uploaded yet.</div>;
  }

  return (
    <ul className="document-list">
      {documents.map((doc) => {
        const isDeleting = deletingDocumentIds?.has(doc.id) ?? false;
        const deleteError = deleteErrors?.[doc.id];
        const isProcessing = doc.status === 'processing';

        return (
          <li key={doc.id} className="document-list-item">
            <div className="document-list-item-main">
              <span className="document-filename">{doc.filename}</span>
              <div className="document-list-item-actions">
                <StatusBadge status={doc.status} />
                {onRequestDelete && (
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
                )}
              </div>
            </div>
            <div className="document-list-item-meta">
              <span>{doc.page_count != null ? `${doc.page_count} pages` : 'Pages unknown'}</span>
              <span>{formatDate(doc.created_at)}</span>
            </div>
            {deleteError && (
              <div className="document-list-item-error" role="alert">
                {deleteError}{' '}
                <button type="button" className="retry-delete-btn" onClick={() => onRequestDelete?.(doc)}>
                  Retry
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default DocumentList;
