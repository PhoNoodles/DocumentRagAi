import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { fetchDocuments, getErrorMessage, uploadDocument } from '../api';
import { useDocumentDeletion } from '../hooks/useDocumentDeletion';
import type { DocumentRecord } from '../types';
import DocumentList from './DocumentList';
import DeleteDocumentDialog from './DeleteDocumentDialog';
import './UploadPanel.css';

function UploadPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  const loadDocuments = async () => {
    setDocumentsLoading(true);
    setDocumentsError(null);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      setDocumentsError(getErrorMessage(err, 'Failed to load documents.'));
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments()
      .then((docs) => setDocuments(docs))
      .catch((err) => setDocumentsError(getErrorMessage(err, 'Failed to load documents.')))
      .finally(() => setDocumentsLoading(false));
  }, []);

  const handleDocumentDeleted = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  const { target, deletingIds, errors, requestDelete, cancelDelete, confirmDelete } =
    useDocumentDeletion(handleDocumentDeleted);

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported.');
      return;
    }
    setFileName(file.name);
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    selectFile(e.target.files?.[0]);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      selectFile(file);
    }
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError('Please select a PDF file.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const result = await uploadDocument(file);
      setUploadSuccess(`"${result.filename}" uploaded and indexed (${result.pages} pages).`);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDocuments();
    } catch (err) {
      setUploadError(getErrorMessage(err, "Failed to upload document. Make sure it's a valid PDF with extractable text."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-panel">
      <div className="upload-card">
        <div className="upload-icon">📤</div>
        <h2>Upload Your Document</h2>
        <p>Drop a PDF file or click to browse</p>

        <div
          className="upload-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            className="browse-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {fileName ? `📄 ${fileName}` : 'Choose PDF File'}
          </button>
        </div>

        {uploadError && <div className="error-message">{uploadError}</div>}
        {uploadSuccess && <div className="success-message">{uploadSuccess}</div>}

        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={!fileName || uploading}
        >
          {uploading ? (
            <>
              <span className="spinner"></span>
              Uploading...
            </>
          ) : (
            'Upload & Index'
          )}
        </button>
      </div>

      <div className="document-list-card">
        <div className="document-list-header">
          <h3>Your Documents</h3>
          <button className="refresh-btn" onClick={loadDocuments} disabled={documentsLoading}>
            ⟳ Refresh
          </button>
        </div>
        <DocumentList
          documents={documents}
          loading={documentsLoading}
          error={documentsError}
          onRequestDelete={requestDelete}
          deletingDocumentIds={deletingIds}
          deleteErrors={errors}
        />
      </div>

      {target && (
        <DeleteDocumentDialog
          targetDocument={target}
          deleting={deletingIds.has(target.id)}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

export default UploadPanel;
