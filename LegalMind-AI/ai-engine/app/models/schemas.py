from pydantic import BaseModel
from typing import Literal

class RiskFinding(BaseModel):
    clause: str          # Pehle 'clause_text' tha 
    page_number: int
    type: str            # Pehle 'section_title' tha (e.g. Financial, Operational)
    severity: Literal["Critical", "High", "Medium", "Low"] # 'risk_level' ki jagah
    explanation: str
    recommendation: str
