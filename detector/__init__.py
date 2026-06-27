# detector/__init__.py
from detector.classifier import get_detector, DetectionResult

def analyze(text: str) -> DetectionResult:
    """
    Public API for the detector module.
    Usage: from detector import analyze
    """
    return get_detector().analyze(text)

__all__ = ["analyze", "DetectionResult"]
