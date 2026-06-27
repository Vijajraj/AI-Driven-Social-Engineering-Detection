# Week 1 Spec — AI-Driven Social Engineering Detection
**Scope**: Data pipeline + ML classifier + SHAP explainability  
**Output by Day 7**: A clean `detector/` Python module that takes raw text in and returns `{label, confidence, shap_top_features}` out.

---

## Directory Structure (End of Week 1 Target)

```
social-engineering-detector/
├── data/
│   ├── raw/                        # downloaded datasets go here (gitignored)
│   │   ├── sms_spam.csv
│   │   ├── ceas_phishing.csv
│   │   ├── enron_ham.csv
│   │   ├── fraud_emails.csv
│   │   └── social_eng.csv          # optional / generated
│   └── processed/
│       ├── dataset.csv             # unified, cleaned, balanced
│       └── eda_report.json         # class counts, length stats, URL stats
├── training/
│   ├── data_prep.py                # ✅ already written
│   ├── eda.py                      # Day 2
│   ├── features.py                 # Day 3–4
│   ├── train.py                    # Day 5
│   └── evaluate.py                 # Day 6
├── detector/
│   ├── __init__.py
│   ├── preprocessor.py             # Day 3
│   ├── rule_engine.py              # Day 4
│   ├── classifier.py               # Day 6
│   └── model/
│       ├── xgb_model.pkl           # saved after training
│       ├── tfidf_vectorizer.pkl    # saved after training
│       └── metadata.json           # accuracy, f1, trained_at, version
├── .env.example
├── .gitignore
└── requirements.txt
```

---

## Day 1–2: Dataset Download + EDA

### Goal
All 5 raw CSVs downloaded. `data_prep.py` runs clean. EDA written and outputs summary stats.

---

### Day 1 — Download + Run `data_prep.py`

**Checklist**
- [ ] Create the folder structure above
- [ ] Set up `.gitignore` — add `data/raw/`, `data/processed/`, `detector/model/`, `.env`
- [ ] Create `requirements.txt` (see below)
- [ ] Download all 4 primary datasets from Kaggle, place in `data/raw/`
- [ ] Run `python training/data_prep.py` — confirm it prints class distribution table
- [ ] Verify output: `data/processed/dataset.csv` exists and has ~18,000 rows (6 classes × 3,000)

**requirements.txt**
```
pandas==2.1.4
numpy==1.26.4
scikit-learn==1.4.0
xgboost==2.0.3
shap==0.44.1
python-dotenv==1.0.0
fastapi==0.109.0
uvicorn==0.27.0
langchain==0.1.6
langchain-groq==0.0.1
supabase==2.3.4
pydantic==2.5.3
matplotlib==3.8.2
seaborn==0.13.2
joblib==1.3.2
pytest==7.4.4
httpx==0.26.0
```

**Dataset Download Links**

| File | Kaggle Link | Notes |
|---|---|---|
| `sms_spam.csv` | `uciml/sms-spam-collection-dataset` | download `spam.csv`, rename |
| `ceas_phishing.csv` | `rtatman/fraudulent-email-corpus` | or any CEAS 2008 mirror |
| `enron_ham.csv` | `wcukierski/enron-email-dataset` | filter ham rows only, save body column |
| `fraud_emails.csv` | `rtatman/fraudulent-email-corpus` | same source, different filter |

> **Enron note**: The full dataset is large. Filter for ham-labeled rows only, extract the message body column, save first 35,000 rows. You only need benign examples.

---

### Day 2 — EDA (`training/eda.py`)

**Goal**: Understand what's in your data before training anything. Catch problems early.

**Write `training/eda.py`:**

```python
# training/eda.py

import pandas as pd
import json
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

DATA_PATH = Path("data/processed/dataset.csv")
OUTPUT_DIR = Path("data/processed")


def run_eda(df: pd.DataFrame) -> dict:
    report = {}

    # 1. Class distribution
    class_counts = df["label"].value_counts().to_dict()
    report["class_counts"] = class_counts
    print("\n── Class Distribution ──")
    for label, count in class_counts.items():
        print(f"  {label:<25} {count:>5}")

    # 2. Text length stats per class
    df["word_count"] = df["text"].str.split().str.len()
    length_stats = df.groupby("label")["word_count"].describe().round(1).to_dict()
    report["length_stats"] = length_stats
    print("\n── Word Count Stats per Class ──")
    print(df.groupby("label")["word_count"].describe().round(1))

    # 3. URL presence rate per class
    df["has_url"] = df["text"].str.contains(r"\bURL\b", na=False)
    url_rate = df.groupby("label")["has_url"].mean().round(3).to_dict()
    report["url_presence_rate"] = url_rate
    print("\n── URL Presence Rate per Class ──")
    for label, rate in url_rate.items():
        print(f"  {label:<25} {rate:.1%}")

    # 4. Urgency keyword rate
    urgency_pattern = r"\b(urgent|immediately|verify|suspended|expires|act now|limited time|click here|confirm your|alert)\b"
    df["has_urgency"] = df["text"].str.contains(urgency_pattern, na=False)
    urgency_rate = df.groupby("label")["has_urgency"].mean().round(3).to_dict()
    report["urgency_keyword_rate"] = urgency_rate
    print("\n── Urgency Keyword Rate per Class ──")
    for label, rate in urgency_rate.items():
        print(f"  {label:<25} {rate:.1%}")

    # 5. Top 10 tokens per class (simple frequency)
    print("\n── Top 10 Tokens per Class ──")
    top_tokens = {}
    for label in df["label"].unique():
        subset = df[df["label"] == label]["text"]
        all_words = " ".join(subset).split()
        freq = pd.Series(all_words).value_counts().head(10).to_dict()
        top_tokens[label] = freq
        print(f"\n  [{label}]")
        for word, count in freq.items():
            print(f"    {word}: {count}")
    report["top_tokens_per_class"] = top_tokens

    return report


def plot_class_distribution(df: pd.DataFrame):
    plt.figure(figsize=(10, 5))
    order = df["label"].value_counts().index
    sns.countplot(data=df, x="label", order=order, palette="Set2")
    plt.title("Class Distribution")
    plt.xlabel("Attack Type")
    plt.ylabel("Count")
    plt.xticks(rotation=20)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "class_distribution.png", dpi=150)
    print("\n✅ Saved class_distribution.png")


def plot_word_length_distribution(df: pd.DataFrame):
    df["word_count"] = df["text"].str.split().str.len()
    plt.figure(figsize=(12, 5))
    for label in df["label"].unique():
        subset = df[df["label"] == label]["word_count"]
        subset[subset < 200].plot(kind="kde", label=label)
    plt.title("Word Count Distribution per Class")
    plt.xlabel("Word Count")
    plt.legend()
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "word_length_dist.png", dpi=150)
    print("✅ Saved word_length_dist.png")


if __name__ == "__main__":
    df = pd.read_csv(DATA_PATH)
    report = run_eda(df)
    plot_class_distribution(df)
    plot_word_length_distribution(df)

    with open(OUTPUT_DIR / "eda_report.json", "w") as f:
        json.dump(report, f, indent=2)
    print("\n✅ EDA complete. Check data/processed/ for outputs.")
```

**Day 2 checklist**
- [ ] Run `python training/eda.py`
- [ ] Read the class distribution — are all 6 classes present and balanced?
- [ ] Check URL presence rate — phishing should be highest, benign should be lowest
- [ ] Check urgency keyword rate — urgency_manipulation + phishing should be highest
- [ ] Look at top tokens — do they make sense for each class? Any garbage data leaking in?
- [ ] Flag any class with < 1,000 samples — raise that to 3,000 via upsampling in `data_prep.py`

**EDA red flags to watch for**
- Benign class has urgency keywords at > 30% → Enron data quality issue
- A class has mean word count of < 5 → text cleaning too aggressive
- URL presence in benign > 20% → likely malformed rows slipping through

---

## Day 3–4: Feature Engineering

### Goal
Build the feature matrix that your XGBoost model will train on. Two types: TF-IDF (learned) + handcrafted rule features (deterministic).

---

### Day 3 — Preprocessor + Rule Engine

**Write `detector/preprocessor.py`:**

```python
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
```

**Write `detector/rule_engine.py`:**

```python
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
```

**Day 3 checklist**
- [ ] Write both files above
- [ ] Quick sanity test in Python REPL:
  ```python
  from detector.preprocessor import preprocess
  from detector.rule_engine import extract_rule_features
  ct = preprocess("URGENT: Your PayPal account has been suspended. Click here to verify.")
  print(extract_rule_features(ct))
  # urgency_score, credential_score, brand_mention_count should all be > 0
  ```
- [ ] Confirm `RULE_FEATURE_NAMES` has exactly 12 names matching `extract_rule_features` output keys

---

### Day 4 — Feature Matrix Builder (`training/features.py`)

```python
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
        print(f"✅ TF-IDF: {X_tfidf.shape[1]} features")
    else:
        X_tfidf = vectorizer.transform(cleaned_texts)

    # Rule-based features
    print("Extracting rule features...")
    rule_features = np.array([
        extract_rule_feature_array(preprocess(t)) for t in raw_texts
    ], dtype=np.float32)
    X_rules = csr_matrix(rule_features)
    print(f"✅ Rule features: {X_rules.shape[1]} features ({RULE_FEATURE_NAMES})")

    # Combine
    X_combined = hstack([X_tfidf, X_rules])
    print(f"✅ Combined feature matrix: {X_combined.shape}")

    y = df["label"].map(LABEL_MAP).values
    return X_combined, y, vectorizer


if __name__ == "__main__":
    df = pd.read_csv(DATA_PATH)
    X, y, vec = build_feature_matrix(df, fit=True)
    print(f"\nFeature matrix shape: {X.shape}")
    print(f"Label distribution: {pd.Series(y).value_counts().to_dict()}")
```

**Day 4 checklist**
- [ ] Run `python training/features.py` — confirm feature matrix shape prints (should be ~18000 × ~10012)
- [ ] `detector/model/tfidf_vectorizer.pkl` exists after running
- [ ] No import errors — confirms `detector/` is a proper Python package (has `__init__.py`)

---

## Day 5: Model Training (`training/train.py`)

### Goal
Train XGBoost classifier. Save model artifact with metadata. Target: F1 macro > 0.82.

```python
# training/train.py

import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from xgboost import XGBClassifier

from training.features import build_feature_matrix, LABEL_MAP, LABEL_NAMES, DATA_PATH
from training.evaluate import evaluate_model

MODEL_DIR = Path("detector/model")
MODEL_DIR.mkdir(parents=True, exist_ok=True)


XGB_PARAMS = {
    "n_estimators":     300,
    "max_depth":        6,
    "learning_rate":    0.1,
    "subsample":        0.8,
    "colsample_bytree": 0.8,
    "use_label_encoder": False,
    "eval_metric":      "mlogloss",
    "random_state":     42,
    "n_jobs":           -1,
}


def train():
    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)

    print("Building feature matrix...")
    X, y, vectorizer = build_feature_matrix(df, fit=True)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    print(f"\nTrain: {X_train.shape[0]} | Test: {X_test.shape[0]}")

    print("\nTraining XGBoost...")
    model = XGBClassifier(**XGB_PARAMS)
    model.fit(X_train, y_train)

    print("\nEvaluating...")
    metrics = evaluate_model(model, X_test, y_test, LABEL_NAMES)

    # Cross-validation sanity check
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="f1_macro", n_jobs=-1)
    print(f"\n5-Fold CV F1 Macro: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Save model
    joblib.dump(model, MODEL_DIR / "xgb_model.pkl")

    # Save metadata
    metadata = {
        "trained_at": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "xgb_params": XGB_PARAMS,
        "label_map": LABEL_MAP,
        "label_names": LABEL_NAMES,
        "test_metrics": metrics,
        "cv_f1_macro_mean": float(cv_scores.mean()),
        "cv_f1_macro_std": float(cv_scores.std()),
        "feature_count": X.shape[1],
        "training_samples": int(X_train.shape[0]),
    }
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n✅ Model saved to {MODEL_DIR}/")
    print(f"   Test F1 Macro:  {metrics['f1_macro']:.4f}")
    print(f"   Test Accuracy:  {metrics['accuracy']:.4f}")

    if metrics["f1_macro"] < 0.75:
        print("\n⚠️  F1 below 0.75. Check class balance and feature quality before proceeding.")
    else:
        print("\n🚀 Model performance acceptable. Proceed to evaluation + SHAP.")


if __name__ == "__main__":
    train()
```

**Day 5 checklist**
- [ ] Run `python training/train.py`
- [ ] Confirm F1 Macro printed at end — target > 0.82
- [ ] `detector/model/xgb_model.pkl` and `metadata.json` both exist
- [ ] `metadata.json` is human-readable and contains correct label names

---

## Day 6: Evaluation + SHAP (`training/evaluate.py` + `detector/classifier.py`)

### Goal
Understand model performance per class. Integrate SHAP. Wire everything into the `classifier.py` module.

---

**Write `training/evaluate.py`:**

```python
# training/evaluate.py

import numpy as np
import matplotlib.pyplot as plt
import shap
import joblib
from pathlib import Path
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    accuracy_score,
    ConfusionMatrixDisplay,
)


OUTPUT_DIR = Path("data/processed")


def evaluate_model(model, X_test, y_test, label_names: list[str]) -> dict:
    y_pred = model.predict(X_test)

    print("\n── Classification Report ──")
    print(classification_report(y_test, y_pred, target_names=label_names))

    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(8, 6))
    ConfusionMatrixDisplay(cm, display_labels=label_names).plot(ax=ax, colorbar=False)
    plt.title("Confusion Matrix")
    plt.xticks(rotation=30)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "confusion_matrix.png", dpi=150)
    print("✅ Saved confusion_matrix.png")

    return {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "f1_macro": float(f1_score(y_test, y_pred, average="macro")),
        "f1_per_class": {
            name: float(f1_score(y_test == i, y_pred == i))
            for i, name in enumerate(label_names)
        },
    }


def generate_shap_summary(model, X_test, label_names: list[str], feature_names: list[str]):
    """
    Generate and save a SHAP summary bar plot.
    Shows which features matter most globally across all classes.
    """
    print("\nGenerating SHAP values (this takes ~1–2 minutes)...")
    explainer = shap.TreeExplainer(model)
    # Use dense array slice — SHAP doesn't handle sparse well
    X_dense = X_test[:500].toarray()  # sample 500 rows for speed
    shap_values = explainer.shap_values(X_dense)

    # shap_values is list of arrays (one per class) → shape: [n_classes, n_samples, n_features]
    mean_abs_shap = np.mean([np.abs(sv) for sv in shap_values], axis=(0, 1))
    top_indices = np.argsort(mean_abs_shap)[-20:][::-1]

    plt.figure(figsize=(10, 7))
    plt.barh(
        [feature_names[i] for i in top_indices[::-1]],
        mean_abs_shap[top_indices[::-1]],
        color="#4C7BF4"
    )
    plt.xlabel("Mean |SHAP value|")
    plt.title("Top 20 Features by Global SHAP Importance")
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "shap_summary.png", dpi=150)
    print("✅ Saved shap_summary.png")

    return explainer
```

**Write `detector/classifier.py`:**

```python
# detector/classifier.py

import json
import joblib
import numpy as np
from pathlib import Path
from dataclasses import dataclass
from scipy.sparse import hstack, csr_matrix

import shap

from detector.preprocessor import preprocess
from detector.rule_engine import extract_rule_feature_array, RULE_FEATURE_NAMES

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
    Combines TF-IDF + rule features → XGBoost → SHAP explanation.
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
        # shap_values[class_idx] → shape (1, n_features)
        class_shap = shap_values[predicted_class_idx][0]
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
        predicted_idx = int(np.argmax(proba))
        predicted_label = self.label_names[predicted_idx]
        confidence = float(proba[predicted_idx])

        # Risk score: benign caps at 20, others scale with confidence
        if predicted_label == "benign":
            risk_score = int(confidence * 20)
        else:
            risk_score = int(30 + confidence * 70)

        shap_features = self._get_shap_top_features(X_dense, predicted_idx)

        from detector.rule_engine import extract_rule_features
        rule_signals = extract_rule_features(ct)

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
```

**Day 6 checklist**
- [ ] Run full evaluation from `train.py` (already calls `evaluate_model`)
- [ ] Open `confusion_matrix.png` — which classes are most confused? (pretexting/phishing is expected)
- [ ] Run SHAP summary: do the top features make semantic sense? (e.g., "click", "verify", "prize" should rank high)
- [ ] Test `classifier.py` in REPL:
  ```python
  from detector.classifier import get_detector
  d = get_detector()
  result = d.analyze("URGENT: Your HDFC account will be suspended. Click here to verify your details.")
  print(result.label, result.risk_score, result.shap_top_features)
  ```
- [ ] Confirm `risk_score` is between 0–100 and makes intuitive sense

---

## Day 7: Module Integration Test (`detector/__init__.py`)

### Goal
The `detector/` package is clean, self-contained, and tested. Anyone can import it and call `analyze(text)`.

**Write `detector/__init__.py`:**

```python
# detector/__init__.py
from detector.classifier import get_detector, DetectionResult

def analyze(text: str) -> DetectionResult:
    """
    Public API for the detector module.
    Usage: from detector import analyze
    """
    return get_detector().analyze(text)

__all__ = ["analyze", "DetectionResult"]
```

**Write a quick smoke test (`tests/test_detector.py`):**

```python
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
        ["baiting"],
    ),
    (
        "This is IT Support. We need you to provide your VPN password to restore access.",
        ["pretexting"],
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
```

**Run it:**
```bash
pytest tests/ -v
```

**Day 7 checklist**
- [ ] All 4 smoke tests pass (allow 1 fail on edge case, not 2+)
- [ ] `from detector import analyze` works from project root
- [ ] No hardcoded paths — everything uses `pathlib.Path`
- [ ] No print statements left in `classifier.py` or `preprocessor.py`
- [ ] `detector/model/` contains exactly: `xgb_model.pkl`, `tfidf_vectorizer.pkl`, `metadata.json`

---

## End of Week 1 — Definition of Done

```
✅  data/processed/dataset.csv          — 18,000 rows, 6 balanced classes
✅  data/processed/eda_report.json      — class stats, URL rates, urgency rates
✅  data/processed/confusion_matrix.png — model evaluation visual
✅  data/processed/shap_summary.png     — global feature importance visual
✅  detector/model/xgb_model.pkl        — trained classifier
✅  detector/model/tfidf_vectorizer.pkl — fitted vectorizer
✅  detector/model/metadata.json        — F1 macro ≥ 0.82, training params logged
✅  from detector import analyze        — works, returns DetectionResult
✅  pytest tests/ -v                    — 3/4 smoke tests passing minimum
```

If F1 macro is between 0.75–0.82 at end of Day 5, don't spend more than 2 hours tuning — move forward. The LLM reasoning layer in Week 2 covers for marginal model performance.

---

## Known Hard Spots (Read Before You Hit Them)

| Problem | Likely Cause | Fix |
|---|---|---|
| SHAP very slow | Running on full X_test | Slice to 500 rows for summary plot |
| XGBoost memory error | Feature matrix too dense | Confirm `hstack` is keeping sparse format |
| All predictions = "benign" | Class imbalance survived balancing | Re-run `data_prep.py`, check `balance_classes()` output |
| Pretexting F1 < 0.5 | Too few / noisy training samples | Apply keyword heuristic extraction from `data_prep.py` notes |
| `tfidf_vectorizer.pkl` not found | Running `classifier.py` before `train.py` | Always run `train.py` first |
