# api/main.py

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api.dependencies import get_detector_instance
from api.routes import analyze, history, health
from db.client import init_pool, close_pool
from db.migrations import run_migrations


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Load ML model
    print("Loading detector model...")
    detector = get_detector_instance()
    meta = detector.metadata
    print(f"   Model version : {meta['version']}")
    print(f"   Trained at    : {meta['trained_at']}")
    print(f"   F1 Macro      : {meta['test_metrics']['f1_macro']:.4f}")
    print(f"   Labels        : {', '.join(meta['label_names'])}")
    print("SUCCESS: Model loaded.")

    # 2. Connect to Neon PostgreSQL
    print("Connecting to Neon PostgreSQL...")
    await init_pool()
    await run_migrations()

    yield

    # 3. Cleanup on shutdown
    await close_pool()
    print("Database connection closed.")


app = FastAPI(
    title="Social Engineering Detector API",
    description="Hybrid ML + LLM pipeline for detecting social engineering attacks in text.",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health.router,  tags=["Health"])
app.include_router(analyze.router, tags=["Detection"])
app.include_router(history.router, tags=["History"])
