# db/migrations.py
# Runs on every startup. Creates tables if they don't exist.
# Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.

from db.client import get_pool


CREATE_ANALYSES_TABLE = """
CREATE TABLE IF NOT EXISTS analyses (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT now(),
    input_text      TEXT        NOT NULL,
    source          VARCHAR(20) DEFAULT 'unknown',
    label           VARCHAR(30) NOT NULL,
    confidence      FLOAT       NOT NULL,
    risk_score      INT         NOT NULL,
    llm_reasoning   TEXT,
    shap_top_features  JSONB,
    rule_signals       JSONB,
    all_probabilities  JSONB
);
"""

CREATE_CREATED_AT_INDEX = """
CREATE INDEX IF NOT EXISTS analyses_created_at_idx
ON analyses (created_at DESC);
"""

CREATE_LABEL_INDEX = """
CREATE INDEX IF NOT EXISTS analyses_label_idx
ON analyses (label);
"""


async def run_migrations() -> None:
    """
    Create the analyses table and indexes if they don't exist.
    Called once at startup after init_pool().
    """
    pool = get_pool()
    if pool is None:
        return

    async with pool.acquire() as conn:
        await conn.execute(CREATE_ANALYSES_TABLE)
        await conn.execute(CREATE_CREATED_AT_INDEX)
        await conn.execute(CREATE_LABEL_INDEX)
    print("SUCCESS: Migrations complete.")
