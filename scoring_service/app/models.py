from __future__ import annotations

from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, model_validator


class Agent(str, Enum):
    CMO = "CMO"
    CFO = "CFO"
    CTO = "CTO"
    UX = "UX"
    COMPLIANCE = "COMPLIANCE"


class ActionClass(str, Enum):
    AUTO_EXECUTE = "auto_execute"
    APPROVAL = "approval"
    LOG_ONLY = "log_only"
    IGNORE = "ignore"
    BLOCK = "block"


class ScoreInput(BaseModel):
    # raw or normalized feature inputs scaled 0..1 wherever possible
    volume: float = Field(0.0, ge=0.0, le=1.0)
    consistency: float = Field(0.0, ge=0.0, le=1.0)
    accuracy: float = Field(0.0, ge=0.0, le=1.0)

    revenue: float = Field(0.0, ge=0.0, le=1.0)
    traffic: float = Field(0.0, ge=0.0, le=1.0)
    compounding: float = Field(0.0, ge=0.0, le=1.0)

    volatility: float = Field(0.0, ge=0.0, le=1.0)
    dependency: float = Field(0.0, ge=0.0, le=1.0)
    compliance: float = Field(0.0, ge=0.0, le=1.0)

    trend: float = Field(0.0, ge=0.0, le=1.0)
    decay: float = Field(0.0, ge=0.0, le=1.0)
    window: float = Field(0.0, ge=0.0, le=1.0)

    uncertainty: float = Field(0.0, ge=0.0, le=1.0)
    experiment: float = Field(0.0, ge=0.0, le=1.0)
    gap: float = Field(0.0, ge=0.0, le=1.0)

    # raw context / metadata
    request_id: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)


class AnalyzeRequest(BaseModel):
    agent: Agent
    features: ScoreInput
    compliance_flag: bool = False
    autonomous_allowed: bool = False
    event_type: Optional[str] = None


class ScoreSet(BaseModel):
    confidence: float
    impact: float
    risk: float
    urgency: float
    learning: float
    decision_score: float


class AnalyzeResponse(BaseModel):
    agent: Agent
    action_class: ActionClass
    reason: str
    scores: ScoreSet
    thresholds: Dict[str, float]
    recommended_action: str
    debug: Dict[str, Any] = Field(default_factory=dict)


class FeedbackRequest(BaseModel):
    decision_id: str
    agent: Agent
    was_success: bool
    observed_delta: float = Field(..., ge=-1.0, le=1.0)
    feature_bucket: str = Field(..., min_length=1)


class FeedbackResponse(BaseModel):
    decision_id: str
    updated_weight: float
    message: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
