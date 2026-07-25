# tests/test_api.py

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from api.main import app


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac


# ── Health ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_metadata(client):
    response = await client.get("/metadata")
    assert response.status_code == 200
    data = response.json()
    assert len(data["label_names"]) == 6
    assert data["test_f1_macro"] > 0.7


# ── Analyze ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_analyze_phishing(client):
    response = await client.post("/analyze", json={
        "text": "URGENT: Your HDFC account has been suspended. Click here to verify your details.",
        "source": "sms"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["label"] in ["phishing", "urgency_manipulation", "impersonation"]
    assert 0 < data["risk_score"] <= 100
    assert 0.0 < data["confidence"] <= 1.0
    assert len(data["shap_top_features"]) == 5
    assert len(data["llm_reasoning"]) > 10


@pytest.mark.asyncio
async def test_analyze_benign(client):
    response = await client.post("/analyze", json={
        "text": "Hi team, the sprint review is scheduled for Friday at 3pm. Please come prepared.",
        "source": "email"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["label"] == "benign"
    assert data["risk_score"] <= 25


@pytest.mark.asyncio
async def test_analyze_text_too_short_rejected(client):
    response = await client.post("/analyze", json={"text": "hi", "source": "email"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_analyze_text_too_long_rejected(client):
    response = await client.post("/analyze", json={
        "text": "a" * 5001,
        "source": "email"
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_analyze_invalid_source_rejected(client):
    response = await client.post("/analyze", json={
        "text": "Your account has been suspended. Click here.",
        "source": "telegram"
    })
    assert response.status_code == 422


# ── History ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_history_returns_list(client):
    response = await client.get("/history")
    assert response.status_code == 200
    assert isinstance(response.json()["analyses"], list)


@pytest.mark.asyncio
async def test_history_limit_respected(client):
    response = await client.get("/history?limit=3")
    assert response.status_code == 200
    assert len(response.json()["analyses"]) <= 3


@pytest.mark.asyncio
async def test_history_label_filter(client):
    response = await client.get("/history?label=phishing")
    assert response.status_code == 200
    for row in response.json()["analyses"]:
        assert row["label"] == "phishing"
