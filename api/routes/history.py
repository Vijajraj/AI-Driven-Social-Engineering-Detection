# api/routes/history.py

from fastapi import APIRouter, Query
from db.queries import fetch_history

router = APIRouter()


@router.get("/history")
async def get_history(
    limit: int = Query(default=20, ge=1, le=100),
    label: str | None = Query(default=None, description="Filter by attack label"),
):
    """
    Returns recent analyses, newest first.
    Optional: ?label=phishing  to filter by attack type.
    """
    try:
        rows = await fetch_history(limit=limit, label_filter=label)
        return {"analyses": rows, "total": len(rows)}
    except Exception as e:
        return {"analyses": [], "total": 0, "error": str(e)}
