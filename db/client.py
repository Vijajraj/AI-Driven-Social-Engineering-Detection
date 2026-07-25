# db/client.py
# Manages a single asyncpg connection pool shared across the app.

import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    """
    Create the asyncpg connection pool.
    Called once at FastAPI startup via lifespan.
    Neon requires SSL — asyncpg handles this via the sslmode=require in the DSN.
    """
    global _pool
    dsn = os.getenv("DATABASE_URL")
    if not dsn:
        print("⚠️ DATABASE_URL is not set in .env — DB features will be disabled.")
        return

    try:
        _pool = await asyncpg.create_pool(
            dsn=dsn,
            min_size=1,
            max_size=5,       # keep low — Neon free tier has connection limits
            command_timeout=10,
        )
    except Exception as e:
        print(f"⚠️ Failed to connect to database: {e}")
        _pool = None


async def close_pool() -> None:
    """Gracefully close the connection pool on shutdown."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool | None:
    """
    Return the active connection pool if initialized.
    """
    return _pool
