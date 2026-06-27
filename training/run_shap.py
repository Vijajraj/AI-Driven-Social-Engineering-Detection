# training/run_shap.py

import joblib
import json
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split

from training.features import build_feature_matrix, RULE_FEATURE_NAMES, LABEL_NAMES, DATA_PATH
from training.evaluate import generate_shap_summary

MODEL_DIR = Path("detector/model")

def run():
    print("Loading model and vectorizer...")
    model = joblib.load(MODEL_DIR / "xgb_model.pkl")
    vectorizer = joblib.load(MODEL_DIR / "tfidf_vectorizer.pkl")
    
    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    
    print("Building feature matrix (inference mode)...")
    X, y, _ = build_feature_matrix(df, vectorizer=vectorizer, fit=False)
    
    # Split the exact same way as train.py (random_state=42)
    _, X_test, _, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    
    # Reconstruct all feature names (TF-IDF vocabulary + 12 handcrafted rules)
    vocab = vectorizer.get_feature_names_out().tolist()
    feature_names = vocab + RULE_FEATURE_NAMES
    
    print("Running SHAP analysis...")
    generate_shap_summary(model, X_test, LABEL_NAMES, feature_names)

if __name__ == "__main__":
    run()
