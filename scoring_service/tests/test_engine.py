from app.engine import compute_core_scores, analyze
from app.models import AnalyzeRequest, Agent, ScoreInput


def test_compute_scores():
    scores = compute_core_scores(ScoreInput(
        volume=1, consistency=1, accuracy=1,
        revenue=1, traffic=1, compounding=1,
        volatility=0, dependency=0, compliance=0,
        trend=1, decay=1, window=1,
        uncertainty=1, experiment=1, gap=1
    ))
    assert scores["confidence"] == 1
    assert scores["impact"] == 1
    assert scores["risk"] == 0


def test_analyze_approval():
    req = AnalyzeRequest(
        agent=Agent.CMO,
        autonomous_allowed=False,
        features=ScoreInput(
            volume=0.9, consistency=0.9, accuracy=0.9,
            revenue=0.7, traffic=0.8, compounding=0.7,
            volatility=0.2, dependency=0.2, compliance=0.1,
            trend=0.8, decay=0.7, window=0.7,
            uncertainty=0.5, experiment=0.4, gap=0.6,
            context={"feature_bucket": "content_refresh"}
        )
    )
    resp = analyze(req)
    assert resp.action_class.value in {"approval", "auto_execute", "log_only"}
