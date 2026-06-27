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

    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred, target_names=label_names))

    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(8, 6))
    ConfusionMatrixDisplay(cm, display_labels=label_names).plot(ax=ax, colorbar=False)
    plt.title("Confusion Matrix")
    plt.xticks(rotation=30)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "confusion_matrix.png", dpi=150)
    print("SUCCESS: Saved confusion_matrix.png")

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
    print("\nGenerating SHAP values (this takes ~1-2 minutes)...")
    explainer = shap.TreeExplainer(model)
    # Use dense array slice - SHAP doesn't handle sparse well
    X_dense = X_test[:500].toarray()  # sample 500 rows for speed
    shap_values = explainer.shap_values(X_dense)

    # shap_values is list of arrays (one per class) -> shape: [n_classes, n_samples, n_features]
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
    print("SUCCESS: Saved shap_summary.png")

    return explainer
