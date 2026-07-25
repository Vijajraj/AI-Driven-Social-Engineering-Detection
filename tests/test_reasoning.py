# tests/test_reasoning.py

import pytest
from detector.classifier import DetectionResult
from llm.reasoning_chain import generate_reasoning


MOCK_RESULT = DetectionResult(
    label="phishing",
    confidence=0.91,
    risk_score=84,
    all_probabilities={
        "benign": 0.02, "phishing": 0.91, "impersonation": 0.03,
        "urgency_manipulation": 0.02, "baiting": 0.01, "pretexting": 0.01
    },
    shap_top_features=[
        {"feature": "verify",    "impact": 0.42},
        {"feature": "URL",       "impact": 0.38},
        {"feature": "click",     "impact": 0.31},
        {"feature": "account",   "impact": 0.24},
        {"feature": "suspended", "impact": 0.19},
    ],
    rule_signals={
        "url_count": 1.0, "credential_score": 0.08,
        "urgency_score": 0.04, "brand_mention_count": 0.0,
        "email_count": 0.0, "phone_count": 0.0, "bait_score": 0.0,
        "authority_score": 0.0, "is_short": 0.0, "exclamation_count": 1.0,
        "all_caps_word_ratio": 0.05, "has_greeting": 0.0,
    }
)


@pytest.mark.asyncio
async def test_reasoning_returns_string():
    reasoning = await generate_reasoning(MOCK_RESULT, source="email")
    assert isinstance(reasoning, str)
    assert len(reasoning) > 30


@pytest.mark.asyncio
async def test_reasoning_not_empty_on_benign():
    benign = DetectionResult(
        label="benign", confidence=0.95, risk_score=5,
        all_probabilities={"benign": 0.95, "phishing": 0.01,
                           "impersonation": 0.01, "urgency_manipulation": 0.01,
                           "baiting": 0.01, "pretexting": 0.01},
        shap_top_features=[{"feature": "meeting", "impact": 0.12}],
        rule_signals={
            "url_count": 0.0, "urgency_score": 0.0, "credential_score": 0.0,
            "bait_score": 0.0, "brand_mention_count": 0.0, "email_count": 0.0,
            "phone_count": 0.0, "authority_score": 0.0, "is_short": 0.0,
            "exclamation_count": 0.0, "all_caps_word_ratio": 0.0, "has_greeting": 1.0
        }
    )
    reasoning = await generate_reasoning(benign, source="email")
    assert isinstance(reasoning, str)
    assert len(reasoning) > 10
