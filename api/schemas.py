# api/schemas.py

from pydantic import BaseModel, Field
from typing import Literal


# ── Request ───────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=5,
        max_length=5000,
        description="Raw message text to analyze (email body, SMS, chat message)."
    )
    source: Literal["email", "sms", "chat", "unknown"] = Field(
        default="unknown",
        description="Channel the message came from. Used for context in LLM reasoning."
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "text": "URGENT: Your HDFC account has been suspended. Click here to verify your details immediately.",
                "source": "sms"
            }
        }
    }


# ── Response ──────────────────────────────────────────────────────

class SHAPFeature(BaseModel):
    feature: str
    impact: float


class AnalyzeResponse(BaseModel):
    label: str
    confidence: float
    risk_score: int
    all_probabilities: dict[str, float]
    shap_top_features: list[SHAPFeature]
    rule_signals: dict[str, float]
    llm_reasoning: str
    analysis_id: str


class HealthResponse(BaseModel):
    status: Literal["ok"]
    model_version: str
    trained_at: str


class MetadataResponse(BaseModel):
    model_version: str
    trained_at: str
    label_names: list[str]
    feature_count: int
    test_f1_macro: float
    cv_f1_macro_mean: float
