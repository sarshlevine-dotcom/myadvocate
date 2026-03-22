# Export Pipeline — GitHub → Drive → NotebookLM

**Status:** v1 manual-first, automation-ready

---

## Purpose

Defines how documentation moves from GitHub into Google Drive and then into NotebookLM.

---

## Core principle

Exports are **intentional, not automatic dumps**.

We do NOT mirror the repo. We curate outputs.

---

## Pipeline stages

### Stage 1 — Source (GitHub)

All documents originate in:
- `docs/`
- selected root files (SYSTEM.md, CLAUDE.md)

Claude/Cowork maintains these.

---

### Stage 2 — Selection

Approved categories:
- architecture summaries
- sprint summaries
- content strategy
- agent summaries
- implementation packs

---

### Stage 3 — Transformation

Convert into:
- Google Docs (preferred)
- PDF (for static packs)

Naming convention:

`MA-[CATEGORY]-[DATE]-[TITLE].docx`

Example:
`MA-SYS-2026-03-21-Export-Pipeline.docx`

---

### Stage 4 — Placement (Drive)

Route to correct folder:
- Strategy
- Architecture
- Content
- Agents
- NotebookLM sources

---

### Stage 5 — NotebookLM ingestion

Only files inside:
`06_Exports_For_NotebookLM`

---

## Automation roadmap

### Phase 1 (now)
- manual export
- founder-curated selection

### Phase 2
- GitHub Action detects changes in `/docs/system/`, `/docs/seo/`, etc.
- triggers export script

### Phase 3
- n8n workflow
  - watches repo changes
  - transforms markdown → doc
  - uploads to Drive
  - optionally tags for NotebookLM

---

## Guardrails

- Never export raw DB data
- Never export PII
- Never auto-sync entire repo
- Always respect SYSTEM.md

---

## Key insight

This pipeline exists to create a **clean thinking layer**, not a mirror of the system.
