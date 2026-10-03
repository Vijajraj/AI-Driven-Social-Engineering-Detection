# detector/classifier.py

import json
import joblib
import re
import numpy as np
from pathlib import Path
from dataclasses import dataclass
from scipy.sparse import hstack, csr_matrix

import shap

from detector.preprocessor import preprocess
from detector.rule_engine import extract_rule_features, extract_rule_feature_array, RULE_FEATURE_NAMES

MODEL_DIR = Path("detector/model")


@dataclass
class DetectionResult:
    label: str                          # predicted attack type
    confidence: float                   # probability of predicted class (0–1)
    risk_score: int                     # 0–100 for UI display
    all_probabilities: dict[str, float] # probability per class
    shap_top_features: list[dict]       # [{"feature": str, "impact": float}, ...]
    rule_signals: dict[str, float]      # raw rule engine output


class SocialEngineeringDetector:
    """
    Load-once, call-many classifier.
    Combines TF-IDF + rule features -> XGBoost -> SHAP explanation.
    """

    def __init__(self):
        self.model = joblib.load(MODEL_DIR / "xgb_model.pkl")
        self.vectorizer = joblib.load(MODEL_DIR / "tfidf_vectorizer.pkl")
        with open(MODEL_DIR / "metadata.json") as f:
            self.metadata = json.load(f)
        self.label_names: list[str] = self.metadata["label_names"]
        self.explainer = shap.TreeExplainer(self.model)

        # Full feature name list (TF-IDF vocab + rule names)
        tfidf_names = self.vectorizer.get_feature_names_out().tolist()
        self.feature_names = tfidf_names + RULE_FEATURE_NAMES

    def _build_feature_vector(self, text: str):
        ct = preprocess(text)
        X_tfidf = self.vectorizer.transform([ct.cleaned])
        X_rules = csr_matrix(extract_rule_feature_array(ct).reshape(1, -1))
        return hstack([X_tfidf, X_rules]), ct

    def _get_shap_top_features(self, X_dense: np.ndarray, predicted_class_idx: int, top_n: int = 5) -> list[dict]:
        shap_values = self.explainer.shap_values(X_dense)
        if isinstance(shap_values, list):
            class_shap = shap_values[predicted_class_idx][0]
        elif isinstance(shap_values, np.ndarray):
            if len(shap_values.shape) == 3:
                if shap_values.shape[2] == len(self.label_names):
                    class_shap = shap_values[0, :, predicted_class_idx]
                else:
                    class_shap = shap_values[predicted_class_idx, 0, :]
            else:
                class_shap = shap_values[0]
        else:
            class_shap = np.zeros(len(self.feature_names))

        top_indices = np.argsort(np.abs(class_shap))[-top_n:][::-1]
        return [
            {
                "feature": self.feature_names[i],
                "impact": round(float(class_shap[i]), 4),
            }
            for i in top_indices
        ]

    def analyze(self, text: str) -> DetectionResult:
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty.")

        X, ct = self._build_feature_vector(text)
        X_dense = X.toarray()

        proba = self.model.predict_proba(X_dense)[0]

        rule_signals = extract_rule_features(ct)

        predicted_idx = int(np.argmax(proba))
        predicted_label = self.label_names[predicted_idx]
        confidence = float(proba[predicted_idx])

        # Deterministic legitimate transactional check:
        # If all links in the message are from verified authentic corporate domains
        # (e.g. qualcomm.com, google.com, microsoft.com, amazon.com, apple.com)
        # and it's a standard verification or registration email, it is BENIGN.
        legitimate_domains = (
            "qualcomm.com", "google.com", "microsoft.com", "apple.com", "amazon.com",
            "github.com", "linkedin.com", "netflix.com", "uber.com", "zoom.us",
            "adobe.com", "salesforce.com", "spotify.com", "slack.com"
        )
        urls = re.findall(r"https?://([a-zA-Z0-9.\-_]+)", text)
        if urls:
            all_legit = all(
                any(u.lower() == d or u.lower().endswith("." + d) for d in legitimate_domains)
                for u in urls
            )
            has_reg_keywords = any(k in text.lower() for k in ["registration", "validate your email", "verify your email", "verification code", "confirm your email"])
            if all_legit and has_reg_keywords:
                predicted_label = "benign"
                predicted_idx = self.label_names.index("benign")
                confidence = 0.95
                proba = np.array([0.95 if name == "benign" else 0.01 for name in self.label_names])

        # Soft benign override: ONLY if ML confidence is low AND no rule signals fire.
        has_rule_signal = (
            rule_signals["url_count"] > 0 or
            rule_signals["email_count"] > 0 or
            rule_signals["phone_count"] > 0 or
            rule_signals["urgency_score"] > 0 or
            rule_signals["authority_score"] > 0 or
            rule_signals["credential_score"] > 0 or
            rule_signals["bait_score"] > 0 or
            rule_signals["brand_mention_count"] > 0
        )

        if predicted_label != "benign" and not has_rule_signal and confidence < 0.50:
            predicted_label = "benign"
            predicted_idx = self.label_names.index("benign")
            confidence = max(float(proba[predicted_idx]), 0.60)

        # Risk score: benign caps at 20, others scale with confidence
        if predicted_label == "benign":
            risk_score = int(confidence * 20)
        else:
            risk_score = int(30 + confidence * 70)

        shap_features = self._get_shap_top_features(X_dense, predicted_idx)

        return DetectionResult(
            label=predicted_label,
            confidence=round(confidence, 4),
            risk_score=min(risk_score, 100),
            all_probabilities={
                name: round(float(p), 4)
                for name, p in zip(self.label_names, proba)
            },
            shap_top_features=shap_features,
            rule_signals=rule_signals,
        )


# Singleton — load once at module import
_detector: SocialEngineeringDetector | None = None


def get_detector() -> SocialEngineeringDetector:
    global _detector
    if _detector is None:
        _detector = SocialEngineeringDetector()
    return _detector
