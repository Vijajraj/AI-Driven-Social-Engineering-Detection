# tests/test_detector.py

import pytest
from detector import analyze


TEST_CASES = [
    (
        "URGENT: Your PayPal account has been suspended. Click here to verify your login.",
        ["phishing", "impersonation", "urgency_manipulation"],
    ),
    (
        "Hi team, just a reminder that the sprint review is tomorrow at 3pm.",
        ["benign"],
    ),
    (
        "Congratulations! You have won a $1,000,000 lottery. Claim your prize now.",
        ["baiting", "phishing"],
    ),
    (
        "This is IT Support. We need you to provide your VPN password to restore access.",
        ["pretexting", "impersonation", "phishing"],
    ),
]


@pytest.mark.parametrize("text, acceptable_labels", TEST_CASES)
def test_detector_basic(text, acceptable_labels):
    result = analyze(text)
    assert result.label in acceptable_labels, (
        f"Expected one of {acceptable_labels}, got '{result.label}'"
    )
    assert 0 <= result.risk_score <= 100
    assert 0.0 <= result.confidence <= 1.0
    assert len(result.shap_top_features) == 5
    assert all("feature" in f and "impact" in f for f in result.shap_top_features)
