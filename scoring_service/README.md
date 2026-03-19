
# MyAdvocate Scoring Service — v2.0 (Modular)

Internal autonomous decision engine. **Never user-facing. No PII. No letter content.**

## Structure

```
scoring_service/
  app/
    __init__.py
    models.py      — Pydantic enums, bounded ScoreInput, AnalyzeRequest/Response
    engine.py      — Scoring math, AGENT_FORMULAS, decision routing, learning weights
    main.py        — FastAPI routes (/health, /analyze, /feedback)
  tests/
    __init__.py
    test_engine.py — Unit tests for scoring engine
  n8n_workflows/
    cto_sentinel.json                — 6h api_cost_spike detection (S0-01)
    cmo_content_refresh.json         — Weekly content decay scoring (S1-02)
    cfo_conversion_insight.json      — Weekly funnel metrics scoring (S2-01)
    stripe_webhook_to_supabase.json  — Stripe → Supabase billing events (S0-01 real data)
    cmo_real_data_refresh_queue.json — GSC → CMO refresh queue (S1-01 real data)
    cfo_cohort_scoring.json          — GA4 → CFO cohort scoring (S2-01 real data)
  docs/
    FIELD_MAPPING.md
    IMPLEMENTATION_CHECKLIST.md
  weights.json     — auto-generated; learning weights per feature_bucket
  requirements.txt
  README.md
```

## Run the service

```bash
cd scoring_service
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open interactive docs at: `http://127.0.0.1:8000/docs`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Service health check |
| POST | /analyze | 16-feature input → 5 scores + action class |
| POST | /feedback | Learning loop update for a decision bucket |

## Agents

| Agent | Formula Focus | Use Case |
|-------|-------------|----------|
| CMO | Impact + Confidence | Content refresh, cluster prioritization |
| CFO | Impact − Risk | Conversion scoring, offer timing |
| CTO | Risk + Urgency | Cost spikes, reliability alerts |
| UX | Impact + Learning | Funnel drop-off, CTA optimization |
| COMPLIANCE | Risk-blocking | Compliance flags → BLOCK unconditionally |

## Key invariants

- `autonomous_allowed: false` by default — AUTO tier only fires when explicitly enabled
- Bucket 1 AI calls (letter generation) **never** set `autonomous_allowed: true`
- `compliance_flag: true` always routes to BLOCK regardless of score
- All weight changes traceable via `weights.json` + Supabase `scoring_feedback` table

## Run tests

```bash
cd scoring_service
pytest tests/ -v
```
