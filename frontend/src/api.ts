import axios from 'axios';
import type { DeleteDocumentResponse, DocumentRecord, Source } from './types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
});

interface UploadResponse {
  message: string;
  document_id: string;
  filename: string;
  pages: number;
}

interface ChatResponse {
  answer: string;
  sources: Source[];
}

export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return fallback;
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await client.post<UploadResponse>('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const response = await client.get<DocumentRecord[]>('/documents');
  return response.data;
}

export async function askQuestion(
  question: string,
  documentIds: string[]
): Promise<ChatResponse> {
  const response = await client.post<ChatResponse>('/chat', {
    question,
    document_ids: documentIds,
  });
  return response.data;
}

export async function deleteDocument(documentId: string): Promise<DeleteDocumentResponse> {
  const response = await client.delete<DeleteDocumentResponse>(`/documents/${documentId}`);
  return response.data;
}

export function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
