import type { DocumentRecord } from '../types';
import './DocumentList.css';

interface DocumentListProps {
  documents: DocumentRecord[];
  loading: boolean;
  error: string | null;
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

function DocumentList({ documents, loading, error }: DocumentListProps) {
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
      {documents.map((doc) => (
        <li key={doc.id} className="document-list-item">
          <div className="document-list-item-main">
            <span className="document-filename">{doc.filename}</span>
            <StatusBadge status={doc.status} />
          </div>
          <div className="document-list-item-meta">
            <span>{doc.page_count != null ? `${doc.page_count} pages` : 'Pages unknown'}</span>
            <span>{formatDate(doc.created_at)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default DocumentList;
