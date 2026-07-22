import React, { useRef, useState } from 'react';
import axios from 'axios';
import './DocumentUpload.css';

const API_BASE_URL = 'http://localhost:8000';

interface DocumentUploadProps {
  onDocumentUploaded: (documentId: string, filename: string) => void;
}

interface UploadResponse {
  message: string;
  document_id: string;
  filename: string;
  pages: number;
}

function DocumentUpload({ onDocumentUploaded }: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);

    try {
      const response = await axios.post<UploadResponse>(
        `${API_BASE_URL}/documents/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      onDocumentUploaded(response.data.document_id, response.data.filename);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        'Failed to upload document. Make sure it\'s a valid PDF with extractable text.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files[0] && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(files[0]);
      fileInputRef.current.files = dt.files;
      setFileName(files[0].name);
      setError(null);
    }
  };

  return (
    <div className="upload-container">
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
            accept=".pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            className="browse-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {fileName ? `📄 ${fileName}` : 'Choose PDF File'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={!fileName || loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Uploading...
            </>
          ) : (
            'Upload & Index'
          )}
        </button>

        <div className="upload-info">
          <p>✓ Supports PDF files</p>
          <p>✓ Automatically extracts and indexes text</p>
          <p>✓ Ready for questions</p>
        </div>
      </div>
    </div>
  );
}

export default DocumentUpload;
