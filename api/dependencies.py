# api/dependencies.py

from functools import lru_cache
from detector.classifier import get_detector, SocialEngineeringDetector


@lru_cache(maxsize=1)
def get_detector_instance() -> SocialEngineeringDetector:
    """
    Loads XGBoost model + vectorizer + SHAP explainer once.
    Subsequent calls return the cached instance.
    Takes ~3–5 seconds on first call.
    """
    return get_detector()
