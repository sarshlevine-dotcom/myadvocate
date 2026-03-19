
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from pathlib import Path
import json

app = FastAPI(title="MyAdvocate Scoring Service", version="1.1.0")

STATE_DIR = Path(__file__).parent / "state"
STATE_DIR.mkdir(exist_ok=True)
WEIGHTS_FILE = STATE_DIR / "weights.json"
HISTORY_FILE = STATE_DIR / "feedback_history.jsonl"

DEFAULT_AGENT_WEIGHTS = {
    "CMO": {"impact": 0.35, "confidence": 0.25, "urgency": 0.20, "learning": 0.20, "risk": -0.20},
    "CFO": {"impact": 0.45, "confidence": 0.25, "urgency": 0.15, "learning": 0.15, "risk": -0.30},
    "CTO": {"risk": 0.40, "urgency": 0.30, "impact": 0.20, "confidence": 0.10, "learning": 0.0},
    "UX":  {"impact": 0.30, "confidence": 0.20, "urgency": 0.20, "learning": 0.30, "risk": -0.15},
}

DEFAULT_METRIC_WEIGHTS = {
    "confidence": {"volume": 0.4, "consistency": 0.3, "accuracy": 0.3},
    "impact": {"revenue": 0.5, "traffic": 0.3, "compounding": 0.2},
    "risk": {"volatility": 0.4, "dependency": 0.3, "compliance": 0.3},
    "urgency": {"trend": 0.5, "decay": 0.3, "window": 0.2},
    "learning": {"uncertainty": 0.5, "experiment": 0.3, "gap": 0.2},
}

DEFAULT_THRESHOLDS = {
    "block_risk": 0.75,
    "min_confidence": 0.50,
    "auto": 0.80,
    "approval": 0.65,
    "log": 0.45
}

def clamp(v: float) -> float:
    return max(0.0, min(1.0, float(v)))

def weighted_sum(values: Dict[str, float], weights: Dict[str, float]) -> float:
    total = 0.0
    for k, w in weights.items():
        total += clamp(values.get(k, 0.0)) * w
    return clamp(total)

def load_state() -> Dict[str, Any]:
    if WEIGHTS_FILE.exists():
        return json.loads(WEIGHTS_FILE.read_text())
    state = {
        "agent_weights": DEFAULT_AGENT_WEIGHTS,
        "metric_weights": DEFAULT_METRIC_WEIGHTS,
        "thresholds": DEFAULT_THRESHOLDS,
        "historical_accuracy_by_decision_type": {},
    }
    WEIGHTS_FILE.write_text(json.dumps(state, indent=2))
    return state

def save_state(state: Dict[str, Any]) -> None:
    WEIGHTS_FILE.write_text(json.dumps(state, indent=2))

class AnalyzeInput(BaseModel):
    agent: str = Field(default="CMO", pattern="^(CMO|CFO|CTO|UX)$")
    decision_type: str = "generic"
    volume: float
    consistency: float
    accuracy: float
    revenue: float
    traffic: float
    compounding: float
    volatility: float
    dependency: float
    compliance: float
    trend: float
    decay: float
    window: float
    uncertainty: float
    experiment: float
    gap: float
    metadata: Optional[Dict[str, Any]] = None

class FeedbackInput(BaseModel):
    decision_type: str
    agent: str = Field(default="CMO", pattern="^(CMO|CFO|CTO|UX)$")
    outcome: str = Field(pattern="^(success|failure|neutral)$")
    actual_lift: Optional[float] = 0.0
    notes: Optional[str] = None

def compute_scores(payload: AnalyzeInput, state: Dict[str, Any]) -> Dict[str, float]:
    p = payload.model_dump()
    metrics = state["metric_weights"]
    confidence = weighted_sum(p, metrics["confidence"])
    impact = weighted_sum(p, metrics["impact"])
    risk = weighted_sum(p, metrics["risk"])
    urgency = weighted_sum(p, metrics["urgency"])
    learning = weighted_sum(p, metrics["learning"])

    # historical accuracy boost by decision type
    hist = state["historical_accuracy_by_decision_type"].get(payload.decision_type, 0.5)
    confidence = clamp((confidence * 0.85) + (hist * 0.15))

    return {
        "confidence": round(confidence, 4),
        "impact": round(impact, 4),
        "risk": round(risk, 4),
        "urgency": round(urgency, 4),
        "learning": round(learning, 4),
    }

def enforce(scores: Dict[str, float], payload: AnalyzeInput, state: Dict[str, Any]) -> Dict[str, Any]:
    weights = state["agent_weights"][payload.agent]
    thresholds = state["thresholds"]

    decision_score = (
        weights.get("impact", 0.0) * scores["impact"] +
        weights.get("confidence", 0.0) * scores["confidence"] +
        weights.get("urgency", 0.0) * scores["urgency"] +
        weights.get("learning", 0.0) * scores["learning"] +
        weights.get("risk", 0.0) * scores["risk"]
    )

    decision_score = round(decision_score, 4)

    if scores["risk"] > thresholds["block_risk"]:
        action = "BLOCK"
        reason = "risk_above_threshold"
    elif scores["confidence"] < thresholds["min_confidence"]:
        action = "IGNORE"
        reason = "confidence_below_minimum"
    elif decision_score >= thresholds["auto"]:
        action = "AUTO"
        reason = "score_above_auto"
    elif decision_score >= thresholds["approval"]:
        action = "APPROVAL"
        reason = "score_above_approval"
    elif decision_score >= thresholds["log"]:
        action = "LOG"
        reason = "score_above_log"
    else:
        action = "IGNORE"
        reason = "score_below_log"

    return {"decision_score": decision_score, "action": action, "reason": reason}

@app.get("/health")
def health():
    state = load_state()
    return {"status": "ok", "weights_file": str(WEIGHTS_FILE), "thresholds": state["thresholds"]}

@app.get("/state")
def get_state():
    return load_state()

@app.post("/analyze")
def analyze(data: AnalyzeInput):
    state = load_state()
    scores = compute_scores(data, state)
    decision = enforce(scores, data, state)
    return {
        "agent": data.agent,
        "decision_type": data.decision_type,
        "scores": scores,
        **decision,
        "metadata": data.metadata or {}
    }

@app.post("/feedback")
def feedback(item: FeedbackInput):
    state = load_state()
    key = item.decision_type
    current = state["historical_accuracy_by_decision_type"].get(key, 0.5)

    if item.outcome == "success":
        target = 0.8
    elif item.outcome == "failure":
        target = 0.2
    else:
        target = 0.5

    # lightweight learning update
    updated = round((current * 0.8) + (target * 0.2), 4)
    state["historical_accuracy_by_decision_type"][key] = updated
    save_state(state)

    with HISTORY_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(item.model_dump()) + "\n")

    return {
        "status": "updated",
        "decision_type": key,
        "previous_historical_accuracy": current,
        "new_historical_accuracy": updated
    }
