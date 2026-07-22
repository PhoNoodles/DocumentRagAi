import os
from uuid import uuid4

from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import Any

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env.local")
load_dotenv(dotenv_path=ENV_PATH)

# Add these lines:
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY not found in environment. Check your .env.local file.")

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

vector_store = Chroma(
    collection_name="documind_documents",
    embedding_function=embeddings,
    persist_directory="./chroma_db",
)

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)


def index_document(document_name: str, pages: list[dict]) -> str:
    document_id = str(uuid4())

    documents = []

    for page in pages:
        page_text = page["text"]

        if not page_text.strip():
            continue

        documents.append(
            Document(
                page_content=page_text,
                metadata={
                    "document_id": document_id,
                    "document_name": document_name,
                    "page_number": page["page_number"],
                },
            )
        )

    chunks = text_splitter.split_documents(documents)

    for i, chunk in enumerate(chunks[:3]):
        print("------ CHUNK ------")
        print("Chunk index:", i)
        print("Metadata:", chunk.metadata)
        print("Content preview:", chunk.page_content[:500])

    vector_store.add_documents(chunks)

    return document_id


def ask_question(
        question: str, 
        document_id: str | None = None,
        include_debug: bool = False,
) -> dict:
    
    search_kwargs = {
        "k": 4
    }

    if document_id:
        search_kwargs["filter"] = {
            "document_id": document_id
        }

    retriever = vector_store.as_retriever(
        search_kwargs=search_kwargs,
    )

    retrieved_documents = retriever.invoke(question)

    context_parts = []
    for document in retrieved_documents:
            document_name = document.metadata.get(
                "document_name",
                "Unknown document",
            )

            page_number = document.metadata.get(
                "page_number",
                "Unknown page",
            )

            context_parts.append(
                f"""
                Document: {document_name}
                Page: {page_number}

                {document.page_content}
                """.strip()
                        )

    context = "\n\n---\n\n".join(context_parts)

        
    messages = [
        SystemMessage(
            content=(
                "Answer the user's question using only the provided context. "
                "If the context does not contain enough information, say: "
                "\"I could not find that information in the document.\" "
                "Do not use outside knowledge."
            )
        ),
        HumanMessage(
            content=f"""
        Question:
        {question}

        Context:
        {context}
        """.strip()
                ),
        ]

    response = llm.invoke(messages)


    sources = []

    for document in retrieved_documents:
        sources.append(
            {
                "document_name": document.metadata.get(
                    "document_name",
                    "Unknown document",
                ),
                "page_number": document.metadata.get(
                    "page_number",
                ),
                "preview": document.page_content[:300],
            }
        )

    result = {
        "answer": response.content,
        "sources": sources,
    }


    if include_debug:
        retrieved_chunks = []

        for document in retrieved_documents:
            retrieved_chunks.append(
                {
                    "content": document.page_content,
                    "metadata": document.metadata,
                }
            )

        result["retrieved_chunks"] = retrieved_chunks

    return result

def get_indexed_chunks(limit: int = 10) -> dict:
    results = vector_store.get(
        limit=limit,
        include=["documents", "metadatas"]
    )

    chunks = []

    for index, document_text in enumerate(results["documents"]):
        chunks.append(
            {
                "id": results["ids"][index],
                "text_preview": document_text[:500],
                "metadata": results["metadatas"][index],
            }
        )

    return {
        "count": len(chunks),
        "chunks": chunks,
    }

def retrieve_documents(
        questions: str,
        document_id: str | None = None,
        k: int = 4
) -> list[Document]:
    search_kwargs = {"k": k}

    if document_id:
        search_kwargs["filter"] = {"document_id": document_id}

    retriever = vector_store.as_retriever(**search_kwargs)

    return retriever.invoke(questions)