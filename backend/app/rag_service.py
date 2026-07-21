import os
from uuid import uuid4

from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

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


def ask_question(question: str, document_id: str | None = None) -> dict:
    search_kwargs = {"k": 4}

    if document_id:
        search_kwargs["filter"] = {"document_id": document_id}

    retrieved_docs = vector_store.similarity_search(
        question,
        **search_kwargs,
    )

    if not retrieved_docs:
        return {
            "answer": "I could not find that in the uploaded documents.",
            "sources": [],
        }

    context = "\n\n".join(
        [
            f"Source: {doc.metadata['document_name']} page {doc.metadata['page_number']}\n{doc.page_content}"
            for doc in retrieved_docs
        ]
    )

    prompt = f"""
You are a document intelligence assistant.

Answer the user's question using only the provided context.

If the answer is not in the context, say:
"I could not find that in the uploaded documents."

Question:
{question}

Context:
{context}
"""

    response = llm.invoke(prompt)

    sources = [
        {
            "document_name": doc.metadata["document_name"],
            "page_number": doc.metadata["page_number"],
            "preview": doc.page_content[:300],
        }
        for doc in retrieved_docs
    ]

    return {
        "answer": response.content,
        "sources": sources,
    }

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
