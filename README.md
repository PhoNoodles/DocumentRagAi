# DocuMind AI

A full-stack RAG (Retrieval-Augmented Generation) application that lets you upload PDF documents and ask questions about their content using OpenAI.

## Project Structure

```
DocumentRagAi/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, routes, CORS
│   │   ├── document_service.py  # PDF upload and text extraction
│   │   ├── rag_service.py       # LangChain RAG pipeline
│   │   ├── models.py            # Pydantic request/response models
│   │   ├── config.py            # (reserved for config)
│   │   ├── .env.local           # OpenAI API key (not committed)
│   │   └── storage/uploads/     # Uploaded PDF files
│   ├── chroma_db/               # ChromaDB vector store (auto-created)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx                        # Root component, state management
    │   ├── main.tsx                       # React entry point
    │   └── components/
    │       ├── DocumentUpload.tsx         # PDF upload with drag-and-drop
    │       ├── ChatInterface.tsx          # Chat UI with message history
    │       └── SourcesDisplay.tsx         # Collapsible source citations
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI |
| RAG pipeline | LangChain |
| Vector database | ChromaDB (local persistence) |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | OpenAI `gpt-4o-mini` |
| PDF parsing | pypdf |
| Frontend | React 19 + TypeScript |
| Build tool | Vite |
| HTTP client | Axios |

## Prerequisites

- Python 3.11+
- Node.js 18+
- An OpenAI API key from https://platform.openai.com/api-keys

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

Create `backend/app/.env.local`:
```
OPENAI_API_KEY=sk-...your-key-here...
```

Start the backend:
```bash
uvicorn app.main:app --reload
```

Backend runs on http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 (or next available port)

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/documents/upload` | Upload and index a PDF |
| `POST` | `/chat` | Ask a question about a document |
| `GET` | `/debug/chunks` | View stored vector chunks |

### Upload a document
```http
POST /documents/upload
Content-Type: multipart/form-data

file: <PDF file>
```
Returns: `{ message, document_id, filename, pages }`

### Ask a question
```http
POST /chat
Content-Type: application/json

{ "question": "What is a blue whale?", "document_id": "uuid-here" }
```
Returns: `{ answer, sources: [{ document_name, page_number, preview }] }`

## How It Works

1. **Upload** — PDF is saved to `storage/uploads/`, text is extracted page-by-page with pypdf
2. **Index** — Text is split into 1000-character chunks (200 overlap), embedded with OpenAI, stored in ChromaDB with metadata (`document_id`, `document_name`, `page_number`)
3. **Query** — Question is embedded, top-4 similar chunks are retrieved, sent to `gpt-4o-mini` with a strict context-only prompt
4. **Response** — Answer is returned along with source citations (document name, page number, text preview)

## Known Issues / TODO

- [ ] CORS `allow_origins` in `main.py` must match your frontend port (default: `5173`)
- [ ] No authentication — all documents are accessible to anyone
- [ ] No document deletion endpoint
- [ ] ChromaDB persists all uploads across restarts (no cleanup)
