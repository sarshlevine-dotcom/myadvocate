from __future__ import annotations

from fastapi import FastAPI
from .models import AnalyzeRequest, AnalyzeResponse, FeedbackRequest, FeedbackResponse, HealthResponse
from .engine import analyze, update_feedback

app = FastAPI(title="MyAdvocate Scoring Service", version="0.1.0")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="myadvocate-scoring-service", version="0.1.0")


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_route(req: AnalyzeRequest) -> AnalyzeResponse:
    return analyze(req)


@app.post("/feedback", response_model=FeedbackResponse)
def feedback_route(req: FeedbackRequest) -> FeedbackResponse:
    return update_feedback(req)
