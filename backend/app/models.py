from pydantic import BaseModel, Field, ConfigDict


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1)
    document_id: str | None = None


class Source(BaseModel):
    document_name: str
    page_number: int
    preview: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]


class UploadResponse(BaseModel):
    message: str
    document_id: str
    filename: str
    pages: int