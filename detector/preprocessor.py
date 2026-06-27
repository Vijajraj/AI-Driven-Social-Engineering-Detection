# detector/preprocessor.py

import re
from dataclasses import dataclass


@dataclass
class CleanedText:
    original: str
    cleaned: str
    url_count: int
    email_count: int
    phone_count: int


def preprocess(text: str) -> CleanedText:
    """
    Clean raw input text and extract surface-level signal counts.
    Returns both cleaned text (for TF-IDF) and raw counts (for rule engine).
    """
    text = str(text)

    url_count = len(re.findall(r"http\S+|www\S+", text, re.IGNORECASE))
    email_count = len(re.findall(r"\S+@\S+", text))
    phone_count = len(re.findall(r"\d{10,}", text))

    cleaned = text.lower()
    cleaned = re.sub(r"http\S+|www\S+", " URL ", cleaned)
    cleaned = re.sub(r"\S+@\S+", " EMAIL ", cleaned)
    cleaned = re.sub(r"\d{10,}", " PHONE ", cleaned)
    cleaned = re.sub(r"[^a-z\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return CleanedText(
        original=text,
        cleaned=cleaned,
        url_count=url_count,
        email_count=email_count,
        phone_count=phone_count,
    )
