# llm/reasoning_chain.py

import os
import json
import asyncio
import re
from urllib.parse import urlparse
from dotenv import load_dotenv
from groq import Groq
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

_sync_client: Groq | None = None

def get_groq_client() -> Groq:
    global _sync_client
    if _sync_client is None:
        _sync_client = Groq(api_key=os.getenv("GROQ_API_KEY"), timeout=8.0, max_retries=1)
    return _sync_client

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
        if feature.get("impact", 0) > 0:
            lines.append(f"- Text signal '{feature.get('feature', '')}' strongly indicates this class")

    return "\n".join(lines) if lines else "- Behavioral and linguistic pattern matches class profile"


def _extract_domains(text: str) -> list[str]:
    raw_urls = re.findall(r"https?://[^\s'\"<>]+|www\.[^\s'\"<>]+", text, re.IGNORECASE)
    domains = []
    for u in raw_urls:
        if not u.startswith("http"):
            u = "http://" + u
        try:
            parsed = urlparse(u)
            if parsed.netloc:
                domains.append(parsed.netloc.lower())
        except Exception:
            pass
    return list(set(domains))


def _run_sync_verification_and_reasoning(text: str, result: DetectionResult, source: str) -> tuple[DetectionResult, str]:
    client = get_groq_client()
    model_name = "openai/gpt-oss-20b"
    reasoning_text = ""

    # Step 1: Verification guardrail if ML flagged as an attack
    if result.label != "benign":
        try:
            domains = _extract_domains(text)
            domains_str = ", ".join(domains) if domains else "None detected"

            sys_prompt = (
                "You are a senior cybersecurity analyst evaluating communications for social engineering threats. "
                "CRITICAL DOMAIN & CONTEXT VERIFICATION RULES:\n"
                "1. If the message is an official, user-initiated or transactional account confirmation (e.g. account registration, "
                "email verification, OTP code, password reset) AND all embedded links point to legitimate, recognized corporate domains "
                "(such as qualcomm.com, google.com, microsoft.com, apple.com, amazon.com, github.com, etc.), the verdict MUST be 'benign'.\n"
                "2. If links point to suspicious, spoofed, mismatched, typo-squatted domains, or IP addresses, or if the text uses artificial urgency, "
                "credential harvesting, or impersonation, classify accurately as 'phishing', 'impersonation', 'urgency_manipulation', 'baiting', or 'pretexting'.\n"
                "3. If it is standard non-threatening correspondence or casual conversation without deceit, verdict MUST be 'benign'.\n\n"
                "Output STRICT JSON ONLY with keys:\n"
                "- 'verdict': one of 'benign', 'phishing', 'impersonation', 'urgency_manipulation', 'baiting', 'pretexting'\n"
                "- 'reason': 2 concise sentences explaining your security assessment."
            )

            user_prompt = f"""Source channel: {source}
Detected Domains: {domains_str}
Initial ML Model Prediction: {result.label} (Confidence: {round(result.confidence * 100, 1)}%)

Message Body:
\"\"\"{text[:3000]}\"\"\""""

            verif_resp = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=220,
            )

            raw_content = verif_resp.choices[0].message.content or "{}"
            parsed = json.loads(raw_content)
            verdict = parsed.get("verdict", "").strip().lower()
            reason = parsed.get("reason", "").strip()

            if verdict == "benign":
                result.label = "benign"
                result.confidence = 0.95
                result.risk_score = 15
                result.all_probabilities = {k: 0.01 for k in result.all_probabilities}
                result.all_probabilities["benign"] = 0.95
                return result, reason
            elif verdict in LABEL_DESCRIPTIONS and reason:
                result.label = verdict
                # If verified threat, reflect appropriate risk score
                if result.risk_score < 40:
                    result.risk_score = 85
                reasoning_text = reason

        except Exception as e:
            pass

    # Step 2: Reasoning explanation
    if not reasoning_text:
        try:
            signals_summary = _build_signals_summary(result)
            attack_desc = LABEL_DESCRIPTIONS.get(result.label, result.label)

            reasoning_prompt = f"""Classification: {attack_desc}
Confidence: {round(result.confidence * 100, 1)}%
Top detected signals:
{signals_summary}
Channel: {source}

Write a 2-sentence explanation in plain English informing the user why this text was evaluated as {result.label.replace('_', ' ')}."""

            comp = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": "You are a cybersecurity advisor explaining message classifications clearly in 2 concise sentences."},
                    {"role": "user", "content": reasoning_prompt}
                ],
                temperature=0.2,
                max_tokens=180,
            )
            reasoning_text = (comp.choices[0].message.content or "").strip()
        except Exception:
            pass

    if not reasoning_text:
        label_friendly = result.label.replace('_', ' ')
        if result.label == "benign":
            reasoning_text = "This message appears legitimate and safe. It does not exhibit malicious social engineering or credential harvesting tactics."
        else:
            reasoning_text = f"This message has been classified as {label_friendly} with {round(result.confidence * 100, 1)}% confidence based on behavioral and linguistic indicators."

    return result, reasoning_text


async def verify_and_analyze(text: str, result: DetectionResult, source: str = "unknown") -> tuple[DetectionResult, str]:
    """
    Asynchronous non-blocking wrapper running the robust synchronous Groq client in an executor thread.
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _run_sync_verification_and_reasoning, text, result, source)


async def generate_reasoning(result: DetectionResult, source: str = "unknown") -> str:
    _, reasoning = await verify_and_analyze("", result, source)
    return reasoning
