import React, { useState } from 'react';
import './SourcesDisplay.css';

interface Source {
  document_name: string;
  page_number: number;
  preview: string;
}

interface SourcesDisplayProps {
  sources: Source[];
}

function SourcesDisplay({ sources }: SourcesDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="sources-container">
      <button
        className="sources-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="sources-icon">📚</span>
        <span>Sources ({sources.length})</span>
        <span className="toggle-arrow">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="sources-list">
          {sources.map((source, index) => (
            <div key={index} className="source-item">
              <div className="source-header">
                <span className="source-name">{source.document_name}</span>
                <span className="page-badge">Page {source.page_number}</span>
              </div>
              <p className="source-preview">{source.preview}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SourcesDisplay;
