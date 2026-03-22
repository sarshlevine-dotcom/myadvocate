# Product System Overview

**Status:** Active working overview  
**Last updated:** 2026-03-21

---

## Purpose

This file explains the live MyAdvocate product system in plain language so product, content, operations, and future automation can reference one shared view.

It is not a replacement for `SYSTEM.md`, `CLAUDE.md`, or the canonical implementation documents. It is the bridging overview.

---

## What MyAdvocate is

MyAdvocate is an AI-powered patient advocacy platform for everyday Americans dealing with:
- insurance denials
- medical billing disputes
- records access issues
- healthcare navigation friction

The product gives users practical outputs such as:
- appeal letters
- dispute letters
- scripts
- timelines
- rights summaries
- next-step guidance

It does **not** provide legal or medical advice.

---

## Live product surfaces

### Core tools
- Insurance Denial Fighter
- Medical Bill Dispute Tool
- HIPAA Records Request Tool
- Denial Decoder

### Founder / internal surfaces
- Admin dashboard
- Review queue
- Content flywheel tables
- Agent and scoring infrastructure

---

## System layers

| Layer | Purpose | Main location |
|---|---|---|
| UX / product | pages, forms, delivery flows | `src/app/`, `src/components/` |
| Business logic | generation, validation, scrubbers, compliance, gating | `src/lib/` |
| Data | runtime storage, tables, rollups, seeds | `supabase/`, `src/lib/db/` |
| Governance | safety, privacy, YMYL, launch doctrine | `SYSTEM.md`, `CLAUDE.md`, `docs/security/`, `docs/seo/` |
| Intelligence | agents, registries, scoring, planning | `context_registry/`, `.claude/`, `docs/intelligence/`, `docs/agents/` |
| Archive / synthesis | founder-ready exports and analysis layer | Google Drive, NotebookLM |

---

## Product logic model

### User-facing path
1. User enters structured workflow input
2. Input is validated and privacy-scrubbed
3. Generation request passes through gate chain
4. Output is checked against policy and quality rules
5. Artifact is stored with review state and metadata
6. Delivery follows the review model defined in governance docs

### Internal path
1. Events, scores, and workflow states are tracked
2. Admin dashboard reads rollups and queue data
3. Agents and registries support internal planning and sequencing
4. Content engine expands distribution and acquisition over time

---

## Product architecture interpretation

The application is not only a set of tools. It is a governed system made of:
- patient-facing workflows
- review and compliance control points
- internal intelligence layers
- content distribution infrastructure
- founder command surfaces

That means every new feature must fit four tests:
1. Is it useful to the user?
2. Is it compliant with YMYL and privacy rules?
3. Does it fit the existing abstractions?
4. Does it create compounding operational or distribution value?

---

## Relationship to other systems

### GitHub
Source of truth for code and version-controlled docs.

### Google Drive
Archive and export layer for approved founder-readable materials.

### NotebookLM
Read-only synthesis over approved exports.

### Claude / Cowork
Execution layer for implementation, doc upkeep, and repo work.

---

## Current product operating truth

MyAdvocate should be interpreted as a **repo-first, governed product system** with downstream archive and analysis layers.

That means:
- the app is built and governed from the repo
- Drive is downstream
- NotebookLM is downstream of Drive
- no shadow product truth should emerge outside GitHub
