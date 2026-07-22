from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from app.document_service import save_uploaded_file, extract_pdf_text
from app.rag_service import index_document, ask_question, get_indexed_chunks
from app.models import ChatRequest, ChatResponse, UploadResponse

app = FastAPI(title="DocuMind AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok", "app": "DocuMind AI"}


@app.post("/documents/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    file_path = await save_uploaded_file(file)
    pages = extract_pdf_text(file_path)

    has_text = any(page["text"].strip() for page in pages)

    if not has_text:
        raise HTTPException(
            status_code=400,
            detail="This PDF does not contain extractable text.",
        )

    document_id = index_document(
        document_name=file.filename,
        pages=pages,
    )

    return {
        "message": "Document uploaded and indexed successfully.",
        "document_id": document_id,
        "filename": file.filename,
        "pages": len(pages),
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    try:
        result = ask_question(
            question=payload.question,
            document_id=payload.document_id,
        )

        return result

    except Exception as error:
        print("Chat failed:", error)

        raise HTTPException(
            status_code=500,
            detail="Failed to answer question.",
        )

@app.get("/debug/chunks")
def get_chunks():
    return get_indexed_chunks()