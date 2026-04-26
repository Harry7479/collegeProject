from typing import TypedDict
from langgraph.graph import StateGraph, START, END

# 🔥 YEH NAYA IMPORT HAI: Apne asli AI agents ko yahan bula rahe hain
from app.core.agents import query_node, risk_node, summary_node

class LegalGraphState(TypedDict):
    user_query: str
    document_id: str
    final_answer: str

def route_query(state: LegalGraphState):
    query = state["user_query"].lower()
    
    dict1 ={
        "risk_agent":["penalty", "danger", "risk"],
        "summary_agent":["summarize", "summary", "brief"]
    }

    for agent, keywords in dict1.items():
        if any(keyword in query for keyword in keywords):
            return agent
    return "query_agent"

# --- DUMMY WORKERS HUMNE DELETE KAR DIYE! ---

# --- BUILD THE GRAPH ---
workflow = StateGraph(LegalGraphState)

# STEP 1: Graph ko batao ki uske paas kon kon se nodes hain
workflow.add_node("query_agent", query_node)
workflow.add_node("risk_agent", risk_node)
workflow.add_node("summary_agent", summary_node)

# STEP 2: Chauraaha (Decision Point) lagao
workflow.add_conditional_edges(START, route_query)

# STEP 3: Har agent ka kaam khatam hone ke baad graph ko END pe bhejo
workflow.add_edge("query_agent", END)
workflow.add_edge("risk_agent", END)
workflow.add_edge("summary_agent", END)

# Compile the graph into an executable application
app = workflow.compile()

# --- TEST THE GRAPH ---
if __name__ == "__main__":
    print("\n--- TEST 1 (General Q&A) ---")
    # Notice the document_id change! It matches our Pinecone upload
    result1 = app.invoke({
        "user_query": "what is short introduction of the document?", 
        "document_id": "test_doc_001"
    })
    print(f"Final Answer: {result1['final_answer']}")
    
    print("\n--- TEST 2 (Risk Agent - Abhi Dummy) ---")
    result2 = app.invoke({
        "user_query": "What is the penalty for leaving?", 
        "document_id": "test_doc_001"
    })
    print(f"Final Answer: {result2['final_answer']}")