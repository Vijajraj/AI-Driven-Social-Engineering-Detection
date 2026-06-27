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
    print("\n--- Class Distribution ---")
    for label, count in class_counts.items():
        print(f"  {label:<25} {count:>5}")

    # 2. Text length stats per class
    df["word_count"] = df["text"].str.split().str.len()
    length_stats = df.groupby("label")["word_count"].describe().round(1).to_dict()
    report["length_stats"] = length_stats
    print("\n--- Word Count Stats per Class ---")
    print(df.groupby("label")["word_count"].describe().round(1))

    # 3. URL presence rate per class
    df["has_url"] = df["text"].str.contains(r"\bURL\b", na=False)
    url_rate = df.groupby("label")["has_url"].mean().round(3).to_dict()
    report["url_presence_rate"] = url_rate
    print("\n--- URL Presence Rate per Class ---")
    for label, rate in url_rate.items():
        print(f"  {label:<25} {rate:.1%}")

    # 4. Urgency keyword rate
    urgency_pattern = r"\b(urgent|immediately|verify|suspended|expires|act now|limited time|click here|confirm your|alert)\b"
    df["has_urgency"] = df["text"].str.contains(urgency_pattern, na=False)
    urgency_rate = df.groupby("label")["has_urgency"].mean().round(3).to_dict()
    report["urgency_keyword_rate"] = urgency_rate
    print("\n--- Urgency Keyword Rate per Class ---")
    for label, rate in urgency_rate.items():
        print(f"  {label:<25} {rate:.1%}")

    # 5. Top 10 tokens per class (simple frequency)
    print("\n--- Top 10 Tokens per Class ---")
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
    print("\nSUCCESS: Saved class_distribution.png")


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
    print("SUCCESS: Saved word_length_dist.png")


if __name__ == "__main__":
    df = pd.read_csv(DATA_PATH)
    report = run_eda(df)
    plot_class_distribution(df)
    plot_word_length_distribution(df)

    with open(OUTPUT_DIR / "eda_report.json", "w") as f:
        json.dump(report, f, indent=2)
    print("\nSUCCESS: EDA complete. Check data/processed/ for outputs.")
