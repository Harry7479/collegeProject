import os
import pandas as pd
from datasets import Dataset
from dotenv import load_dotenv

# App Imports
from app.core.agents import query_node

# Langchain & Models
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings

# RAGAS Core
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy

load_dotenv()

def run_ragas_evaluation():
    print("🚀 Initializing Evaluation Engine (Groq LLaMA 3 + HuggingFace)...")
    
    # 1. Custom Evaluation Models initialize karo (Warna OpenAI maangega)
    eval_llm = ChatGroq(
        temperature=0, 
        model_name="llama-3.3-70b-versatile", 
        api_key=os.getenv("GROQ_API_KEY")
    )
    eval_embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # Metrics configure karo local models pe
    for metric in [faithfulness, answer_relevancy]:
        metric.llm = eval_llm
        if hasattr(metric, "embeddings"):
            metric.embeddings = eval_embeddings

    # ========================================================
    # ⚠️ IMPORTANT: YAHAN APNI PDF KI CURRENT DOCUMENT_ID DALO!
    # ========================================================
    TEST_DOCUMENT_ID = "69ea74a9191e8ba0492fb186" 

    # Jin questions par test lena hai:
    questions = [
        # "What is the question for leetcode-54?",  # Tumhara DSA document ka hi question
        # "Give example of Common Element in 3 Sorted Array"
        "What is the terms and conditions in this document?"
    ]
    
    answers = []
    contexts = []
    
    # 2. Apni current Pipeline ko test questions bhej ke Answer fetch karo
    for i, q in enumerate(questions):
        print(f"Fetching Answer {i+1}/{len(questions)}: {q}")
        
        state = {"user_query": q, "document_id": TEST_DOCUMENT_ID}
        
        result = query_node(state)
        answers.append(result["final_answer"])
        contexts.append(result.get("contexts", []))
        
    # 3. Ragas Dataset Format Banao
    data = {
        "question": questions,
        "answer": answers,
        "contexts": contexts
    }
    dataset = Dataset.from_dict(data)
    
    # 4. START RAGAS EVALUATION! 
    print("\n Evaluating Trust & Quality with RAGAS (Takes ~30 seconds)...")
    
    eval_result = evaluate(
        dataset=dataset,
        metrics=[faithfulness, answer_relevancy],
        llm=eval_llm,
        embeddings=eval_embeddings,
        raise_exceptions=False
    )
    
    # 5. Output Result as Table
    df = eval_result.to_pandas()
    
    # [NEW] Code jo saari new-lines ko space me convert karke table ko ekdum CLEAN kardega!
    df_clean = df.replace(r'\n', ' ', regex=True)
    
    print("\n================ FINAL EVALUATION SCORES ================\n")
    # Clean wala hi print aur save karaenge
    print(df_clean)
    print("\n=========================================================\n")
    
    df_clean.to_markdown("ragas_evaluation_report.md", index=False)
    print("✅ Result successfully saved in MD!")


if __name__ == "__main__":
    run_ragas_evaluation()
