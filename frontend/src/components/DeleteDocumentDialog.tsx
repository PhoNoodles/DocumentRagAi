import { useEffect, useRef } from 'react';
import type { DocumentRecord } from '../types';
import './DeleteDocumentDialog.css';

interface DeleteDocumentDialogProps {
  targetDocument: DocumentRecord;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteDocumentDialog({ targetDocument, deleting, onCancel, onConfirm }: DeleteDocumentDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="delete-dialog-overlay" onClick={onCancel}>
      <div
        className="delete-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="delete-dialog-title">Delete document?</h3>
        <p id="delete-dialog-description">
          This will permanently remove "{targetDocument.filename}", its uploaded PDF, and its
          indexed chunks. This action cannot be undone.
        </p>
        <div className="delete-dialog-actions">
          <button type="button" className="delete-dialog-cancel-btn" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button
            type="button"
            ref={confirmBtnRef}
            className="delete-dialog-confirm-btn"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete document'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteDocumentDialog;
