# Admin Dashboard — Operating Overview

**Status:** Active working overview  
**Last updated:** 2026-03-21

---

## Purpose

Defines the role of the MyAdvocate admin dashboard as the founder command surface for queue visibility, launch blockers, content operations, monetization tracking, and execution monitoring.

This file is an operational overview, not the implementation spec.

---

## What the dashboard is

The admin dashboard is the internal control surface for:
- launch blocker visibility
- review queue awareness
- content flywheel management
- monetization tracking
- metrics entry and operational follow-up

It is not a replacement for GitHub, Supabase, or canonical docs. It is the working interface over those systems.

---

## System relationship

| System | Role relative to dashboard |
|---|---|
| GitHub | Holds implementation logic, route code, components, server actions, and canonical docs |
| Supabase | Holds runtime tables, views, metrics, queue state, and flywheel records |
| Admin dashboard | Reads and acts on approved runtime views and workflows |
| Google Drive | Receives summaries and exports, not live dashboard state |
| NotebookLM | May analyze exported summaries of dashboard state, not raw internal data |

---

## Dashboard panels

The dashboard should be interpreted as a multi-panel command center that tracks:
- launch blockers
- OpenHands task queue
- content queue
- monetization assets
- metrics and operations data

---

## Data policy

The dashboard reads aggregate and operational data only.

It should never become a direct exposure surface for sensitive user data. Founder command surfaces remain downstream of governed application boundaries.

---

## Workflow role

### Daily use
- check blockers
- inspect queue health
- review content progress
- review metrics
- log actions

### Weekly use
- assess sprint progress
- identify bottlenecks
- review content and monetization priorities
- select items for export or founder synthesis

---

## Relationship to exports

Dashboard state can generate downstream summaries, but those summaries should be curated and scrubbed before export to Drive or NotebookLM.

The live dashboard itself is not a NotebookLM source.

---

## Critical rule

The dashboard is a command surface, not a source of truth.

Truth still lives in:
- repo code
- canonical docs
- runtime database objects
