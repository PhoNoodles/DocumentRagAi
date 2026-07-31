from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4
from sqlalchemy.orm import Session

from app.document_service import save_uploaded_file, extract_pdf_text
from app.rag_service import index_document, ask_question, get_indexed_chunks, delete_document_chunks
from app.models import ChatRequest, ChatResponse, UploadResponse
from app.database import get_db
from app.db_models import DocumentRecord
from pathlib import Path
import traceback

app = FastAPI(title="DocuMind AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://100.108.186.63:5175", "http://localhost:3000","http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok", "app": "DocuMind AI"}

@app.post("/documents/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    document_record = None

    try:
        # save_uploaded_file now returns two values
        file_path, file_hash = await save_uploaded_file(file)

        # Check whether this exact file has been uploaded before
        existing_document = (
            db.query(DocumentRecord)
            .filter(DocumentRecord.file_hash == file_hash)
            .first()
        )

        if existing_document and existing_document.status in [
            "processing",
            "completed",
        ]:
            if existing_document.status == "processing":
                raise HTTPException(
                    status_code=409,
                    detail="This document is currently being processed.",
                )
            else:
                raise HTTPException(
                    status_code=409,
                    detail="This document has already been uploaded.",
                )

        # Retry a previously failed document
        if existing_document and existing_document.status == "failed":
            document_record = existing_document
            document_id = existing_document.id
            document_record.file_path = str(file_path)
            document_record.filename = file.filename or "unknown.pdf"
            document_record.status = "processing"
            document_record.page_count = None

        # This is a completely new document
        else:
            document_id = uuid4()

            document_record = DocumentRecord(
                id=document_id,
                filename=file.filename or "unknown.pdf",
                file_hash=file_hash,
                file_path=str(file_path),
                status="processing",
            )

            db.add(document_record)

        db.commit()

        # Read text from the saved PDF
        pages = extract_pdf_text(file_path)

        has_text = any(
            page["text"].strip()
            for page in pages
        )

        if not has_text:
            document_record.status = "failed"
            db.commit()

            raise HTTPException(
                status_code=400,
                detail="This PDF does not contain extractable text.",
            )

        # Create chunks and embeddings in ChromaDB
        index_document(
            document_id=str(document_id),
            document_name=file.filename or "unknown.pdf",
            pages=pages,
        )

        # Update PostgreSQL after indexing succeeds
        document_record.status = "completed"
        document_record.page_count = len(pages)
        db.commit()

        return {
            "message": "Document uploaded and indexed successfully.",
            "document_id": str(document_id),
            "filename": file.filename or "unknown.pdf",
            "pages": len(pages),
        }

    except HTTPException:
        # Preserve intentional 400 and 409 responses
        raise

    except Exception as error:
        # Reset a failed SQLAlchemy transaction
        db.rollback()

        # Mark the record as failed if one was created or reused
        if document_record is not None:
            try:
                document_record.status = "failed"
                db.commit()
            except Exception:
                db.rollback()

        print("Document upload failed:", error)
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Failed to process document.",
        )

@app.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    try:
        unique_document_ids = list(set(payload.document_ids))

        documents = (
            db.query(DocumentRecord)
            .filter(
                DocumentRecord.id.in_(unique_document_ids),
                DocumentRecord.status == "completed",
            )
            .all()
        )

        if len(documents) != len(unique_document_ids):
            raise HTTPException(
                status_code=404,
                detail="One or more completed documents were not found.",
            )

        result = ask_question(
            question=payload.question,
            document_ids=unique_document_ids,
        )

        return result

    except HTTPException:
        raise

    except Exception as error:
        print("Chat failed:", error)

        raise HTTPException(
            status_code=500,
            detail="Failed to answer question.",
        )

@app.get("/debug/chunks")
def get_chunks():
    return get_indexed_chunks()

@app.get("/documents")
def list_documents(
    db: Session = Depends(get_db),
):
    documents = (
        db.query(DocumentRecord)
        .order_by(DocumentRecord.created_at.desc())
        .all()
    )

    return [
        {
            "id": str(document.id),
            "filename": document.filename,
            "status": document.status,
            "page_count": document.page_count,
            "created_at": document.created_at,
        }
        for document in documents
    ]

@app.delete("/documents/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    document = (
        db.query(DocumentRecord)
        .filter(DocumentRecord.id == document_id)
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    try:
        delete_document_chunks(str(document.id))

        file_path = Path(document.file_path)

        if file_path.exists():
            file_path.unlink()

        db.delete(document)
        db.commit()

        return {
            "message": "Document deleted successfully.",
            "document_id": str(document.id),
        }

    except Exception as error:
        db.rollback()

        print("Document deletion failed:", error)

        raise HTTPException(
            status_code=500,
            detail="Failed to delete document.",
        )