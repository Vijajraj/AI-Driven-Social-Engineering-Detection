# api/routes/health.py

from fastapi import APIRouter, Depends
from api.schemas import HealthResponse, MetadataResponse
from api.dependencies import get_detector_instance

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check(detector=Depends(get_detector_instance)):
    meta = detector.metadata
    return HealthResponse(
        status="ok",
        model_version=meta["version"],
        trained_at=meta["trained_at"],
    )


@router.get("/metadata", response_model=MetadataResponse)
def get_metadata(detector=Depends(get_detector_instance)):
    meta = detector.metadata
    return MetadataResponse(
        model_version=meta["version"],
        trained_at=meta["trained_at"],
        label_names=meta["label_names"],
        feature_count=meta["feature_count"],
        test_f1_macro=meta["test_metrics"]["f1_macro"],
        cv_f1_macro_mean=meta["cv_f1_macro_mean"],
    )
