# llm/reasoning_chain.py

import os
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


REASONING_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a cybersecurity analyst specializing in social engineering attack detection.
Your job is to explain, in plain English, why a message has been flagged as suspicious.

Rules:
- Write exactly 2–3 sentences. No more.
- Be specific — reference the actual signals found in the message.
- Do not repeat the attack label. Explain the evidence.
- Do not use bullet points or numbered lists.
- Write for a non-technical audience.
- If the message is benign, briefly explain why it appears safe.""",
    ),
    (
        "human",
        """A message has been analyzed and classified as: {attack_description}
Confidence: {confidence_pct}%

Top signals that triggered this classification:
{signals_summary}

Source channel: {source}

Write a 2–3 sentence explanation of why this message was flagged.""",
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


def build_reasoning_chain():
    llm = ChatGroq(
        model="llama3-8b-8192",
        temperature=0.3,
        max_tokens=200,
        api_key=os.getenv("GROQ_API_KEY"),
    )
    return REASONING_PROMPT | llm | StrOutputParser()


_chain = None


def get_reasoning_chain():
    global _chain
    if _chain is None:
        _chain = build_reasoning_chain()
    return _chain


async def generate_reasoning(result: DetectionResult, source: str = "unknown") -> str:
    """
    Given a DetectionResult, returns a human-readable 2–3 sentence explanation.
    Falls back to a static explanation if Groq call fails.
    """
    chain = get_reasoning_chain()
    signals_summary  = _build_signals_summary(result)
    attack_description = LABEL_DESCRIPTIONS.get(result.label, result.label)

    try:
        reasoning = await chain.ainvoke({
            "attack_description": attack_description,
            "confidence_pct":     round(result.confidence * 100, 1),
            "signals_summary":    signals_summary,
            "source":             source,
        })
        return reasoning.strip()

    except Exception as e:
        print(f"WARNING: Groq reasoning failed: {e}")
        return (
            f"This message was classified as {result.label.replace('_', ' ')} "
            f"with {round(result.confidence * 100, 1)}% confidence. "
            f"Key signals include: {', '.join(f['feature'] for f in result.shap_top_features[:3])}."
        )
