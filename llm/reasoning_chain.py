# llm/reasoning_chain.py

import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from detector.classifier import DetectionResult

load_dotenv()


LABEL_DESCRIPTIONS = {
    "phishing":             "a phishing attack attempting to steal credentials or personal information",
    "impersonation":        "an impersonation attack where the sender poses as a trusted brand or person",
    "urgency_manipulation": "a manipulation attack using artificial urgency or fear to pressure the recipient",
    "baiting":              "a baiting attack using a too-good-to-be-true offer to lure the recipient",
    "pretexting":           "a pretexting attack where the sender fabricates a fake authority or scenario",
    "benign":               "a legitimate, non-threatening message",
}


VERIFICATION_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a senior cybersecurity analyst. Your job is to determine whether a message is an actual malicious social engineering attack OR a legitimate transactional/system message (e.g., account registration, email verification, OTP, password reset, or official notification).

Output format: You MUST respond ONLY with a valid JSON object:
{{
  "verdict": "benign" | "phishing" | "impersonation" | "urgency_manipulation" | "baiting" | "pretexting",
  "reason": "2-sentence plain English explanation."
}}""",
    ),
    (
        "human",
        """Message Text:
\"\"\"{text}\"\"\"

Source channel: {source}
ML Classifier Initial Prediction: {ml_label} (Confidence: {confidence_pct}%)

Examine the links, domains, structure, and intent. If it is an official legitimate verification/transactional email, verdict MUST be "benign". Respond with JSON ONLY:""",
    ),
])


REASONING_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a cybersecurity analyst specializing in social engineering attack detection.
Your job is to explain, in plain English, why a message has been analyzed and classified as benign or suspicious.

Rules:
- Write exactly 2–3 sentences. No more.
- Be specific — reference the actual signals found in the message.
- Write for a non-technical audience.
- If the message is benign, explain why it appears safe.""",
    ),
    (
        "human",
        """A message has been analyzed and classified as: {attack_description}
Confidence: {confidence_pct}%

Top signals that triggered this classification:
{signals_summary}

Source channel: {source}

Write a 2–3 sentence explanation.""",
    ),
])


def _build_signals_summary(result: DetectionResult) -> str:
    lines = []

    significant_rules = {
        k: v for k, v in result.rule_signals.items()
        if v > 0.0 and k not in ("is_short", "has_greeting")
    }
    for key, value in list(significant_rules.items())[:4]:
        readable_key = key.replace("_", " ").title()
        lines.append(f"- {readable_key}: {value:.3f}")

    for feature in result.shap_top_features[:3]:
        if feature["impact"] > 0:
            lines.append(f"- Text signal '{feature['feature']}' strongly indicates this class")

    return "\n".join(lines) if lines else "- No strong individual signals; pattern matches overall profile"


def get_llm():
    return ChatGroq(
        model="groq/compound-mini",
        temperature=0.2,
        max_tokens=250,
        api_key=os.getenv("GROQ_API_KEY"),
    )


async def verify_and_analyze(text: str, result: DetectionResult, source: str = "unknown") -> tuple[DetectionResult, str]:
    """
    Uses LLM to verify ML prediction and eliminate false positives on official transactional emails.
    Returns (updated_result, reasoning_text).
    """
    llm = get_llm()

    # 1. Run Verification Chain if ML flagged text as a threat
    if result.label != "benign":
        try:
            verif_chain = VERIFICATION_PROMPT | llm | StrOutputParser()
            raw_json = await verif_chain.ainvoke({
                "text": text[:3000],
                "source": source,
                "ml_label": result.label,
                "confidence_pct": round(result.confidence * 100, 1),
            })
            
            # Clean JSON string
            cleaned_json = raw_json.strip()
            if "```json" in cleaned_json:
                cleaned_json = cleaned_json.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned_json:
                cleaned_json = cleaned_json.split("```")[1].split("```")[0].strip()

            parsed = json.loads(cleaned_json)
            verdict = parsed.get("verdict", "").lower()
            reason = parsed.get("reason", "").strip()

            if verdict == "benign":
                # Override ML False Positive
                result.label = "benign"
                result.confidence = 0.92
                result.risk_score = 15
                result.all_probabilities["benign"] = 0.92
                return result, reason
            elif verdict in LABEL_DESCRIPTIONS and reason:
                if verdict != result.label:
                    result.label = verdict
                return result, reason

        except Exception as e:
            print(f"WARNING: Groq verification failed/fallback: {e}")

    # 2. Standard Reasoning Chain fallback
    try:
        reasoning_chain = REASONING_PROMPT | llm | StrOutputParser()
        signals_summary = _build_signals_summary(result)
        attack_description = LABEL_DESCRIPTIONS.get(result.label, result.label)

        reasoning = await reasoning_chain.ainvoke({
            "attack_description": attack_description,
            "confidence_pct": round(result.confidence * 100, 1),
            "signals_summary": signals_summary,
            "source": source,
        })
        return result, reasoning.strip()

    except Exception as e:
        print(f"WARNING: Groq reasoning fallback failed: {e}")
        return result, (
            f"This message was classified as {result.label.replace('_', ' ')} "
            f"with {round(result.confidence * 100, 1)}% confidence."
        )


async def generate_reasoning(result: DetectionResult, source: str = "unknown") -> str:
    """Backward compatible wrapper."""
    _, reasoning = await verify_and_analyze("", result, source)
    return reasoning
