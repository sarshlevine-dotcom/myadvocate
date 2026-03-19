from __future__ import annotations

from pathlib import Path
from typing import Dict, Tuple
import json

from .models import ActionClass, Agent, AnalyzeRequest, AnalyzeResponse, FeedbackRequest, FeedbackResponse, ScoreSet

BASE_DIR = Path(__file__).resolve().parent.parent
WEIGHTS_FILE = BASE_DIR / "weights.json"

DEFAULT_LEARNING_WEIGHTS = {
    "default": 0.50
}

AGENT_FORMULAS: Dict[Agent, Dict[str, float]] = {
    Agent.CMO: {"impact": 0.35, "confidence": 0.25, "urgency": 0.20, "learning": 0.20, "risk": -0.20},
    Agent.CFO: {"impact": 0.45, "confidence": 0.25, "urgency": 0.15, "learning": 0.15, "risk": -0.30},
    Agent.CTO: {"risk": 0.40, "urgency": 0.30, "impact": 0.20, "confidence": 0.10, "learning": 0.0},
    Agent.UX: {"impact": 0.30, "learning": 0.30, "confidence": 0.20, "urgency": 0.20, "risk": -0.15},
    Agent.COMPLIANCE: {"risk": 0.50, "confidence": 0.20, "urgency": 0.20, "impact": 0.10, "learning": 0.0},
}

THRESHOLDS = {
    "auto_execute": 0.80,
    "approval": 0.65,
    "log_only": 0.45,
    "risk_block": 0.75,
    "confidence_min": 0.50,
}


def clamp(v: float) -> float:
    return max(0.0, min(1.0, round(v, 4)))


def compute_core_scores(features) -> Dict[str, float]:
    confidence = clamp(0.4 * features.volume + 0.3 * features.consistency + 0.3 * features.accuracy)
    impact = clamp(0.5 * features.revenue + 0.3 * features.traffic + 0.2 * features.compounding)
    risk = clamp(0.4 * features.volatility + 0.3 * features.dependency + 0.3 * features.compliance)
    urgency = clamp(0.5 * features.trend + 0.3 * features.decay + 0.2 * features.window)
    learning = clamp(0.5 * features.uncertainty + 0.3 * features.experiment + 0.2 * features.gap)
    return {
        "confidence": confidence,
        "impact": impact,
        "risk": risk,
        "urgency": urgency,
        "learning": learning,
    }


def load_learning_weights() -> Dict[str, float]:
    if WEIGHTS_FILE.exists():
        return json.loads(WEIGHTS_FILE.read_text())
    return DEFAULT_LEARNING_WEIGHTS.copy()


def save_learning_weights(data: Dict[str, float]) -> None:
    WEIGHTS_FILE.write_text(json.dumps(data, indent=2, sort_keys=True))


def get_learning_multiplier(feature_bucket: str) -> float:
    weights = load_learning_weights()
    return float(weights.get(feature_bucket, weights.get("default", 0.50)))


def compute_decision_score(agent: Agent, score_map: Dict[str, float], feature_bucket: str = "default") -> float:
    formula = AGENT_FORMULAS[agent]
    learning_multiplier = get_learning_multiplier(feature_bucket)

    adjusted_learning = clamp(score_map["learning"] * (0.75 + learning_multiplier / 2))
    score_map = {**score_map, "learning": adjusted_learning}

    value = 0.0
    for k, w in formula.items():
        value += w * score_map.get(k, 0.0)
    # normalize cto/compliance positive-risk styles into 0..1 range approximately
    value = (value + 0.30) / 1.30
    return clamp(value)


def classify_action(req: AnalyzeRequest, score_map: Dict[str, float], decision_score: float) -> Tuple[ActionClass, str, str]:
    risk = score_map["risk"]
    confidence = score_map["confidence"]

    if req.compliance_flag or req.agent == Agent.COMPLIANCE and risk >= 0.50:
        return ActionClass.BLOCK, "Compliance flag or compliance review triggered.", "manual_compliance_review"
    if risk > THRESHOLDS["risk_block"]:
        return ActionClass.BLOCK, "Risk exceeds blocking threshold.", "block_and_review"
    if confidence < THRESHOLDS["confidence_min"]:
        return ActionClass.IGNORE, "Confidence below minimum threshold.", "store_for_digest"
    if decision_score >= THRESHOLDS["auto_execute"] and req.autonomous_allowed:
        return ActionClass.AUTO_EXECUTE, "High score and autonomous action allowed.", "execute_recommended_change"
    if decision_score >= THRESHOLDS["approval"]:
        return ActionClass.APPROVAL, "Action should be routed to founder approval.", "send_slack_approval"
    if decision_score >= THRESHOLDS["log_only"]:
        return ActionClass.LOG_ONLY, "Worth logging and including in digest.", "log_and_digest"
    return ActionClass.IGNORE, "Low-priority recommendation.", "store_only"


def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    core = compute_core_scores(req.features)
    feature_bucket = str(req.features.context.get("feature_bucket", "default"))
    decision_score = compute_decision_score(req.agent, core, feature_bucket=feature_bucket)
    action_class, reason, recommended_action = classify_action(req, core, decision_score)

    return AnalyzeResponse(
        agent=req.agent,
        action_class=action_class,
        reason=reason,
        recommended_action=recommended_action,
        thresholds=THRESHOLDS,
        scores=ScoreSet(**core, decision_score=decision_score),
        debug={
            "feature_bucket": feature_bucket,
            "event_type": req.event_type,
            "autonomous_allowed": req.autonomous_allowed,
        },
    )


def update_feedback(req: FeedbackRequest) -> FeedbackResponse:
    weights = load_learning_weights()
    current = float(weights.get(req.feature_bucket, weights.get("default", 0.50)))
    # conservative step size
    adjustment = 0.05 if req.was_success else -0.05
    adjustment += req.observed_delta * 0.05
    updated = clamp(current + adjustment)
    weights[req.feature_bucket] = updated
    save_learning_weights(weights)
    return FeedbackResponse(
        decision_id=req.decision_id,
        updated_weight=updated,
        message=f"Learning weight for bucket '{req.feature_bucket}' updated from {current:.2f} to {updated:.2f}",
    )
