# db/queries.py

import json
from db.client import get_pool
from api.schemas import AnalyzeRequest, AnalyzeResponse


INSERT_ANALYSIS = """
INSERT INTO analyses (
    input_text, source, label, confidence, risk_score,
    llm_reasoning, shap_top_features, rule_signals, all_probabilities
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id::text;
"""

SELECT_HISTORY = """
SELECT
    id::text,
    created_at,
    source,
    label,
    confidence,
    risk_score,
    llm_reasoning
FROM analyses
ORDER BY created_at DESC
LIMIT $1;
"""

SELECT_HISTORY_FILTERED = """
SELECT
    id::text,
    created_at,
    source,
    label,
    confidence,
    risk_score,
    llm_reasoning
FROM analyses
WHERE label = $2
ORDER BY created_at DESC
LIMIT $1;
"""


async def save_analysis(request: AnalyzeRequest, response: AnalyzeResponse) -> str:
    """
    Persist an analysis result to Neon PostgreSQL.
    Returns the UUID of the created row as a string.
    """
    pool = get_pool()
    if pool is None:
        return ""

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            INSERT_ANALYSIS,
            request.text,
            request.source,
            response.label,
            response.confidence,
            response.risk_score,
            response.llm_reasoning,
            json.dumps([f.model_dump() for f in response.shap_top_features]),
            json.dumps(response.rule_signals),
            json.dumps(response.all_probabilities),
        )

    if not row:
        raise RuntimeError("DB insert returned no row")

    return row["id"]


async def fetch_history(limit: int = 20, label_filter: str | None = None) -> list[dict]:
    """
    Fetch recent analyses, newest first.
    Optionally filter by attack label.
    Returns list of dicts with serializable values.
    """
    pool = get_pool()
    if pool is None:
        return []

    async with pool.acquire() as conn:
        if label_filter and label_filter != "all":
            rows = await conn.fetch(SELECT_HISTORY_FILTERED, limit, label_filter)
        else:
            rows = await conn.fetch(SELECT_HISTORY, limit)

    return [
        {
            "id":            row["id"],
            "created_at":    row["created_at"].isoformat(),
            "source":        row["source"],
            "label":         row["label"],
            "confidence":    row["confidence"],
            "risk_score":    row["risk_score"],
            "llm_reasoning": row["llm_reasoning"],
        }
        for row in rows
    ]
