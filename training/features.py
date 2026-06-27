# training/features.py

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.sparse import hstack, csr_matrix
import joblib

from detector.preprocessor import preprocess
from detector.rule_engine import extract_rule_feature_array, RULE_FEATURE_NAMES

DATA_PATH = Path("data/processed/dataset.csv")
MODEL_DIR = Path("detector/model")
MODEL_DIR.mkdir(parents=True, exist_ok=True)


LABEL_MAP = {
    "benign":                0,
    "phishing":              1,
    "impersonation":         2,
    "urgency_manipulation":  3,
    "baiting":               4,
    "pretexting":            5,
}
LABEL_NAMES = list(LABEL_MAP.keys())


def build_feature_matrix(df: pd.DataFrame, vectorizer: TfidfVectorizer | None = None, fit: bool = True):
    """
    Combines TF-IDF features with 12 handcrafted rule features.
    If fit=True, fits the vectorizer on this data (training).
    If fit=False, uses provided vectorizer (inference).

    Returns: (X_combined, y, vectorizer)
    """
    print("Preprocessing text...")
    cleaned_texts = df["text"].apply(lambda t: preprocess(t).cleaned).tolist()
    raw_texts = df["text"].tolist()

    # TF-IDF features
    if fit:
        vectorizer = TfidfVectorizer(
            max_features=10_000,
            ngram_range=(1, 2),       # unigrams + bigrams
            sublinear_tf=True,        # log(1+tf) scaling
            min_df=3,                 # ignore very rare terms
            strip_accents="unicode",
        )
        X_tfidf = vectorizer.fit_transform(cleaned_texts)
        joblib.dump(vectorizer, MODEL_DIR / "tfidf_vectorizer.pkl")
        print(f"SUCCESS: TF-IDF: {X_tfidf.shape[1]} features")
    else:
        X_tfidf = vectorizer.transform(cleaned_texts)

    # Rule-based features
    print("Extracting rule features...")
    rule_features = np.array([
        extract_rule_feature_array(preprocess(t)) for t in raw_texts
    ], dtype=np.float32)
    X_rules = csr_matrix(rule_features)
    print(f"SUCCESS: Rule features: {X_rules.shape[1]} features ({RULE_FEATURE_NAMES})")

    # Combine
    X_combined = hstack([X_tfidf, X_rules])
    print(f"SUCCESS: Combined feature matrix: {X_combined.shape}")

    y = df["label"].map(LABEL_MAP).values
    return X_combined, y, vectorizer


if __name__ == "__main__":
    df = pd.read_csv(DATA_PATH)
    X, y, vec = build_feature_matrix(df, fit=True)
    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Label distribution: {pd.Series(y).value_counts().to_dict()}")
