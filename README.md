# DocuMind AI

A full-stack **Retrieval-Augmented Generation (RAG)** application. Upload PDF documents and ask questions about their content — answers are grounded in the source text and include page-level citations.

---

## Features

- Upload PDFs and have them automatically indexed into a vector store
- Ask questions across one or multiple documents simultaneously
- Responses include cited sources with document name, page number, and a text preview
- Duplicate detection via file hashing — re-uploading the same file is a no-op
- Full document lifecycle management: upload, list, and delete
- Persistent storage via PostgreSQL (metadata) and ChromaDB (embeddings)
- Docker Compose setup for both production and local development with hot reload

---

## Architecture

```
┌─────────────┐     HTTP      ┌──────────────────┐
│  React SPA  │ ────────────► │  FastAPI Backend  │
│  (Vite)     │ ◄──────────── │                  │
└─────────────┘               └────────┬─────────┘
                                        │
                           ┌────────────┴─────────────┐
                           │                           │
                    ┌──────▼──────┐          ┌────────▼────────┐
                    │ PostgreSQL  │          │    ChromaDB     │
                    │ (metadata)  │          │  (embeddings)   │
                    └─────────────┘          └─────────────────┘
```

### Request flow

1. **Upload** — PDF is saved to disk and its SHA-256 hash is checked against the database to prevent duplicates.
2. **Index** — Text is extracted page-by-page, split into 1000-character chunks (200 overlap), embedded with `text-embedding-3-small`, and stored in ChromaDB.
3. **Query** — The question is embedded; the top-4 semantically similar chunks are retrieved and passed to `gpt-4o-mini` with a strict context-only system prompt.
4. **Response** — The answer is returned alongside source citations (document name, page number, text preview).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI 0.138 |
| RAG pipeline | LangChain + LangChain-Chroma |
| Vector database | ChromaDB (persistent) |
| Relational database | PostgreSQL 16 |
| Migrations | Alembic |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM | OpenAI `gpt-4o-mini` |
| PDF parsing | pypdf |
| Frontend | React 19 + TypeScript |
| Build tool | Vite |
| HTTP client | Axios |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
DocumentRagAi/
├── docker-compose.yml          # Production stack
├── docker-compose.dev.yml      # Dev overrides (hot reload)
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app and all routes
│   │   ├── document_service.py # PDF upload, hashing, text extraction
│   │   ├── rag_service.py      # LangChain RAG pipeline
│   │   ├── db_models.py        # SQLAlchemy ORM models
│   │   ├── models.py           # Pydantic request/response schemas
│   │   └── database.py         # SQLAlchemy engine and session
│   ├── alembic/                # Database migrations
│   ├── evals/                  # RAG evaluation harness
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.tsx             # Root component and state
        ├── api.ts              # Typed API client
        ├── types.ts            # Shared TypeScript types
        └── components/
            ├── UploadPanel.tsx
            ├── DocumentList.tsx
            ├── DocumentSelector.tsx
            ├── ChatPanel.tsx
            ├── ChatInterface.tsx
            └── SourcesDisplay.tsx
```

---

## Quick Start (Docker)

This is the recommended way to run the full stack.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- An OpenAI API key — [get one here](https://platform.openai.com/api-keys)

### 1. Configure environment variables

Create `backend/.env`:

```env
OPENAI_API_KEY=sk-...your-key-here...
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/documind
POSTGRES_DB=documind
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

### 2. Start the stack

```bash
# Production build
docker compose up --build

# Development (hot reload for backend and frontend)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5175 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

### 3. Run database migrations

On first run, apply Alembic migrations inside the backend container:

```bash
docker compose exec backend alembic upgrade head
```

---

## Local Development (without Docker)

### Backend

**Prerequisites:** Python 3.11+, a running PostgreSQL instance.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

Create `backend/app/.env.local`:

```env
OPENAI_API_KEY=sk-...your-key-here...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/documind
```

Run migrations and start the server:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

Backend runs on http://localhost:8000.

### Frontend

**Prerequisites:** Node.js 18+

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173.

---

## Docker Command Reference

### Stack lifecycle

```bash
docker compose up -d                        # Start all services in the background
docker compose up -d --build                # Rebuild images, then start
docker compose up -d --build backend        # Rebuild only the backend image
docker compose down                         # Stop and remove containers
docker compose down -v                      # Stop, remove containers AND volumes (wipes data)
docker compose ps                           # Show running containers and ports
docker compose watch                        # Start with hot reload (uses docker-compose.dev.yml)
```

### Logs

```bash
docker compose logs backend                 # Print all backend logs
docker compose logs -f backend              # Follow backend logs live
docker compose logs backend --tail=100      # Last 100 lines only
```

### Exec / shell access

```bash
docker compose exec backend sh              # Open a shell in the backend container
docker compose exec backend python          # Open a Python REPL in the backend container
docker compose exec backend pytest          # Run tests inside the backend container
docker compose exec postgres psql -U postgres -d DATABASE_NAME   # Open psql prompt
docker compose restart backend              # Restart the backend container
```

### Alembic migrations

```bash
docker compose exec backend alembic upgrade head                         # Apply all pending migrations
docker compose exec backend alembic current                              # Show current revision
docker compose exec backend alembic heads                                # Show latest available revisions
docker compose exec backend alembic revision --autogenerate -m "desc"   # Generate a new migration
docker compose exec backend alembic downgrade -1                        # Roll back one revision
```

### File operations (Windows / Git Bash)

```bash
# Suppress Git Bash path conversion when using absolute container paths
MSYS_NO_PATHCONV=1 docker compose exec backend ls -lt /app/alembic/versions

# Copy a generated migration file out of the container
MSYS_NO_PATHCONV=1 docker compose cp \
  backend:/app/alembic/versions/MIGRATION_FILE.py \
  ./backend/alembic/versions/MIGRATION_FILE.py
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/documents` | List all uploaded documents |
| `POST` | `/documents/upload` | Upload and index a PDF |
| `DELETE` | `/documents/{id}` | Delete a document and its vectors |
| `POST` | `/chat` | Ask a question |
| `GET` | `/debug/chunks` | Inspect raw vector store chunks |

### Upload a document

```http
POST /documents/upload
Content-Type: multipart/form-data

file: <PDF file>
```

```json
{
  "message": "Document uploaded and indexed successfully.",
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "report.pdf",
  "pages": 12
}
```

### Ask a question

```http
POST /chat
Content-Type: application/json

{
  "question": "What were the key findings?",
  "document_ids": ["550e8400-e29b-41d4-a716-446655440000"]
}
```

```json
{
  "answer": "The key findings were ...",
  "sources": [
    {
      "document_name": "report.pdf",
      "page_number": 4,
      "preview": "The study concluded that..."
    }
  ]
}
```

---

## Evaluations

An evaluation harness lives in `backend/evals/`. It runs a set of question–answer pairs from `eval_dataset.json` against a live document and reports accuracy.

```bash
cd backend
EVAL_DOCUMENT_ID=<uuid> python -m evals.run_eval
```

---

## Notes

- **Authentication** — there is none. All documents are visible to any client that can reach the API.
- **CORS** — `allow_origins` in `main.py` is set to specific hosts. Update it if your frontend runs on a different port.
- **Scanned PDFs** — only PDFs with extractable text are supported. Image-only/scanned PDFs will be rejected with a 400 error.
