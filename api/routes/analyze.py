# api/routes/analyze.py

from fastapi import APIRouter, Depends, HTTPException
from api.schemas import AnalyzeRequest, AnalyzeResponse, SHAPFeature
from api.dependencies import get_detector_instance
from llm.reasoning_chain import generate_reasoning
from db.queries import save_analysis

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_text(
    request: AnalyzeRequest,
    detector=Depends(get_detector_instance),
):
    try:
        result = detector.analyze(request.text)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

    reasoning = await generate_reasoning(result, source=request.source)

    response = AnalyzeResponse(
        label=result.label,
        confidence=result.confidence,
        risk_score=result.risk_score,
        all_probabilities=result.all_probabilities,
        shap_top_features=[SHAPFeature(**f) for f in result.shap_top_features],
        rule_signals=result.rule_signals,
        llm_reasoning=reasoning,
        analysis_id="",
    )

    # DB save — fail silently so DB issues never break the main response
    try:
        response.analysis_id = await save_analysis(request, response)
    except Exception as e:
        print(f"WARNING: DB save failed (non-fatal): {e}")

    return response
