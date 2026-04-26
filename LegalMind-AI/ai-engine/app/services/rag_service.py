import os
import requests
import fitz  # PyMuPDF
import nltk
nltk.download('punkt') # First time run me download hoga
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from dotenv import load_dotenv

from langchain_text_splitters import RecursiveCharacterTextSplitter
# .env file se keys read karo
load_dotenv()

# Setup
embedder = SentenceTransformer('all-MiniLM-L6-v2')
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index = pc.Index("legalmind-index")
USE_SPARSE_HYBRID = os.getenv("PINECONE_USE_SPARSE_HYBRID", "false").lower() == "true"

def process_and_ingest_pdf_bytes(file_bytes: bytes, document_id: str):
    print(f"--> Processing doc: {document_id}")

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    raw_text = ""
    for page in doc:
        raw_text += page.get_text()

    if not raw_text.strip():
        raise ValueError("No readable text found in PDF")
        
    # LangChain Text Splitter ka use karke smart chunking karo
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    
    # create_documents ki jagah split_text use karenge
    chunks_list = text_splitter.split_text(raw_text) 

    if not chunks_list:
        raise ValueError("No text chunks generated from PDF")

    bm25 = None
    if USE_SPARSE_HYBRID:
        from pinecone_text.sparse import BM25Encoder
        # BM25 tf-idf encoder setup
        bm25 = BM25Encoder().default()
        # Is document ke saare terms read karke tf-idf format fit karo
        bm25.fit(chunks_list)

    pinecone_vectors = []
    for i, chunk_text in enumerate(chunks_list):
        # Ab chunk_text seedha ek string hai, usko encode karo
        vector = embedder.encode(chunk_text).tolist()
        unique_id = f"{document_id}_chunk_{i}"
        metadata = {"document_id": document_id, "text": chunk_text}

        item = {
            "id": unique_id,
            "values": vector,
            "metadata": metadata,
        }
        if bm25 is not None:
            item["sparse_values"] = bm25.encode_documents([chunk_text])[0]
        pinecone_vectors.append(item)

    pinecone_index.upsert(vectors=pinecone_vectors)
    return len(chunks_list)


# URL-based compatibility helper
def process_and_ingest_pdf(file_url: str, document_id: str):
    response = requests.get(file_url)
    response.raise_for_status()
    return process_and_ingest_pdf_bytes(response.content, document_id)