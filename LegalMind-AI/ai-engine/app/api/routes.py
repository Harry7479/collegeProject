from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import json
import base64

from app.services.rag_service import process_and_ingest_pdf, process_and_ingest_pdf_bytes
from app.core.graph import app as langgraph_app 
from app.core.agents import query_node, risk_node, summary_node

router = APIRouter()

# --- SCHEMAS (Node.js API Gateway expects these) ---
class IngestRequest(BaseModel):
    file_url: str
    document_id: str

class QueryRequest(BaseModel):
    user_query: str
    document_id: str

class DocOnlyRequest(BaseModel):
    document_id: str

# --- 1. INGESTION ENDPOINTS ---
@router.post("/ai/ingest")
async def ingest_endpoint(request: IngestRequest):
    try:
        chunks_saved = process_and_ingest_pdf(request.file_url, request.document_id)
        return {"status": "success", "chunks_processed": chunks_saved, "message": f"{chunks_saved} chunks pushed to Pinecone."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/ingest-file")
async def ingest_file_endpoint(document_id: str = Form(...), file: UploadFile = File(...)):
    try:
        # Securely read streams into bytes without strictly enforcing JSON body inflation
        file_bytes = await file.read()
        chunks_saved = process_and_ingest_pdf_bytes(file_bytes, document_id)
        return {
            "status": "success",
            "chunks_processed": chunks_saved,
            "message": f"{chunks_saved} chunks pushed to Pinecone."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 2. CHATBOT QUERY ENDPOINT ---
@router.post("/ai/query")
async def ask_question(request: QueryRequest):
    try:
        print(f"--> AI received query: '{request.user_query}' for doc: '{request.document_id}'")

        # Chat endpoint should always answer the asked question from the selected document.
        # Risk/Summary keyword routing can cause unrelated outputs in free-form chat,
        # so we directly invoke the strict query agent here.
        result = query_node({
            "user_query": request.user_query,
            "document_id": request.document_id
        })
        
        return {
            "status": "success",
            "document_id": request.document_id,
            "question": request.user_query,
            "answer": result["final_answer"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. DEDICATED RISK ANALYSIS ENDPOINT ---
@router.post("/ai/analyze-risk")
async def analyze_document_risk(request: DocOnlyRequest):
    try:
        # Directly invoke the risk agent with standard state dictionary
        state = {"document_id": request.document_id, "user_query": ""}
        result = risk_node(state)
        
        # risk_node returns a JSON string in final_answer based on our Pydantic schema
        import json
        risks_data = json.loads(result["final_answer"])
        
        return {
            "status": "success",
            "document_id": request.document_id,
            "risk_findings": [risks_data]  # Wrapping inside an array for the gateway
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 4. DEDICATED SUMMARY ENDPOINT ---
@router.post("/ai/summary")
async def get_document_summary(request: DocOnlyRequest):
    try:
        # Directly invoke the summary agent
        state = {"document_id": request.document_id, "user_query": ""}
        result = summary_node(state)
        
        return {
            "status": "success",
            "document_id": request.document_id,
            "summary": result["final_answer"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
