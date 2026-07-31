export type DocumentStatus = 'processing' | 'completed' | 'failed';

export interface DocumentRecord {
  id: string;
  filename: string;
  status: DocumentStatus;
  page_count: number | null;
  created_at: string | null;
}

export interface Source {
  document_name: string;
  page_number: number;
  preview: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export interface DeleteDocumentResponse {
  message: string;
  document_id: string;
}
