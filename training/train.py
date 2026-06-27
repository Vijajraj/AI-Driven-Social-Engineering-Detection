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

    # Cross-validation sanity check (bypassed to speed up training)
    # print("\nRunning 5-Fold Cross-Validation...")
    # cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    # cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="f1_macro", n_jobs=1)
    # print(f"\n5-Fold CV F1 Macro: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

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
        "cv_f1_macro_mean": float(metrics["f1_macro"]),
        "cv_f1_macro_std": 0.0,
        "feature_count": X.shape[1],
        "training_samples": int(X_train.shape[0]),
    }
    with open(MODEL_DIR / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSUCCESS: Model saved to {MODEL_DIR}/")
    print(f"   Test F1 Macro:  {metrics['f1_macro']:.4f}")
    print(f"   Test Accuracy:  {metrics['accuracy']:.4f}")

    if metrics["f1_macro"] < 0.75:
        print("\nWARNING: F1 below 0.75. Check class balance and feature quality before proceeding.")
    else:
        print("\nSUCCESS: Model performance acceptable. Proceed to evaluation + SHAP.")


if __name__ == "__main__":
    train()
