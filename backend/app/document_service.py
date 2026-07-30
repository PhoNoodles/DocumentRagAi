import hashlib
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from pypdf import PdfReader

UPLOAD_DIR = Path("app/storage/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def save_uploaded_file(file: UploadFile) -> Path:
    file_extension = Path(file.filename or "").suffix
    safe_filename = f"{uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / safe_filename

    await file.seek(0)
    contents = await file.read()

    if not contents:
        raise ValueError("The uploaded file is empty.")

    file_hash = hashlib.sha256(contents).hexdigest()

    file_path.write_bytes(contents)

    return file_path, file_hash


def extract_pdf_text(file_path: Path) -> list[dict]:
    reader = PdfReader(str(file_path))
    pages = []

    for index, page in enumerate(reader.pages):
        text = page.extract_text() or ""

        pages.append(
            {
                "page_number": index + 1,
                "text": text,
            }
        )
    
    print("Extracted pages:")
    for page in pages:
        print({
            "page_number": page["page_number"],
            "text_preview": page["text"][:300]
        })

    return pages