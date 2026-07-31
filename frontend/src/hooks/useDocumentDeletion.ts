import { useState } from 'react';
import axios from 'axios';
import { deleteDocument, getErrorMessage } from '../api';
import type { DocumentRecord } from '../types';

export function useDocumentDeletion(onDeleted: (documentId: string) => void) {
  const [target, setTarget] = useState<DocumentRecord | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const requestDelete = (doc: DocumentRecord) => {
    setErrors((prev) => {
      if (!(doc.id in prev)) return prev;
      const next = { ...prev };
      delete next[doc.id];
      return next;
    });
    setTarget(doc);
  };

  const cancelDelete = () => setTarget(null);

  const confirmDelete = async () => {
    if (!target) return;
    const doc = target;
    setTarget(null);
    setDeletingIds((prev) => new Set(prev).add(doc.id));

    try {
      await deleteDocument(doc.id);
      onDeleted(doc.id);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        onDeleted(doc.id);
      } else {
        setErrors((prev) => ({ ...prev, [doc.id]: getErrorMessage(err, 'Failed to delete document.') }));
      }
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };

  return { target, deletingIds, errors, requestDelete, cancelDelete, confirmDelete };
}
