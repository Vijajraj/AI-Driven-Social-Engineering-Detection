# detector/rule_engine.py

import re
import numpy as np
from detector.preprocessor import CleanedText


# ── Keyword lists ──────────────────────────────────────────────────

URGENCY_KEYWORDS = [
    "urgent", "immediately", "expires", "act now", "limited time",
    "within 24 hours", "account suspended", "verify now", "deadline",
    "last chance", "final notice", "respond immediately", "time sensitive"
]

AUTHORITY_KEYWORDS = [
    "it support", "helpdesk", "hr department", "payroll team", "legal team",
    "compliance", "management", "ceo", "director", "your manager",
    "court order", "legal notice", "irs", "income tax", "government"
]

CREDENTIAL_KEYWORDS = [
    "click here", "login", "sign in", "verify your account", "confirm password",
    "update your details", "enter your", "provide your", "reset your password",
    "confirm your identity", "authentication required"
]

BRAND_NAMES = [
    "paypal", "amazon", "microsoft", "apple", "google", "netflix",
    "facebook", "instagram", "whatsapp", "twitter", "bank", "citibank",
    "chase", "wells fargo", "hdfc", "icici", "sbi", "axis bank"
]

BAIT_KEYWORDS = [
    "you have won", "congratulations", "prize", "reward", "free gift",
    "lottery", "selected", "lucky winner", "claim your", "million dollars",
    "inheritance", "transfer funds", "beneficiary"
]


def _keyword_hit_count(text: str, keywords: list[str]) -> int:
    text_lower = text.lower()
    return sum(1 for kw in keywords if kw in text_lower)


def extract_rule_features(ct: CleanedText) -> dict[str, float]:
    """
    Extract 12 handcrafted binary/count features from cleaned text.
    These supplement TF-IDF with deterministic signal.
    """
    text = ct.original.lower()
    word_count = len(ct.cleaned.split()) or 1  # avoid div by zero

    return {
        # Surface counts
        "url_count":            float(ct.url_count),
        "email_count":          float(ct.email_count),
        "phone_count":          float(ct.phone_count),

        # Keyword signals (normalized by word count)
        "urgency_score":        _keyword_hit_count(text, URGENCY_KEYWORDS) / word_count,
        "authority_score":      _keyword_hit_count(text, AUTHORITY_KEYWORDS) / word_count,
        "credential_score":     _keyword_hit_count(text, CREDENTIAL_KEYWORDS) / word_count,
        "bait_score":           _keyword_hit_count(text, BAIT_KEYWORDS) / word_count,
        "brand_mention_count":  float(_keyword_hit_count(text, BRAND_NAMES)),

        # Structural signals
        "is_short":             float(word_count < 20),
        "exclamation_count":    float(ct.original.count("!")),
        "all_caps_word_ratio":  sum(1 for w in ct.original.split() if w.isupper()) / word_count,
        "has_greeting":         float(any(g in text for g in ["dear", "hello", "hi ", "good morning"])),
    }


def extract_rule_feature_array(ct: CleanedText) -> np.ndarray:
    """Returns rule features as a numpy array in fixed order."""
    features = extract_rule_features(ct)
    return np.array(list(features.values()), dtype=np.float32)


RULE_FEATURE_NAMES = [
    "url_count", "email_count", "phone_count",
    "urgency_score", "authority_score", "credential_score",
    "bait_score", "brand_mention_count", "is_short",
    "exclamation_count", "all_caps_word_ratio", "has_greeting"
]
