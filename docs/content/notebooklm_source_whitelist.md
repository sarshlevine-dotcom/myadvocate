# NotebookLM Source Whitelist

**Status:** Active working whitelist  
**Last updated:** 2026-03-21

---

## Purpose

Defines which MyAdvocate documentation categories may be promoted into NotebookLM source folders after normalization and export.

This file complements:
- `docs/system/notebooklm_sources.md`
- `docs/system/export_whitelist.json`
- `SYSTEM.md`
- `CLAUDE.md`

---

## Approval principle

NotebookLM only reads:
- approved exports
- founder-readable packets
- compliance-safe summaries

It does not read raw implementation state or user-linked data.

---

## Approved categories

### Always eligible after export review
- `docs/system/**`
- `docs/product/**`
- `docs/content/**`
- `docs/operations/**`
- selected strategic summaries from `docs/pmp/`
- selected implementation summaries from `docs/intelligence/`
- selected governance docs from `docs/security/`, `docs/seo/`, `docs/agents/`, `docs/context/`

### Conditionally eligible
These require a deliberate export decision:
- launch checklists
- founder memos
- sprint packets
- sanitized dashboard summaries
- selected agent architecture summaries

### Not eligible by default
- raw draft output
- review queue packets
- case-linked artifacts
- direct analytics or event table exports
- context registry files copied wholesale

---

## Promotion checklist

A file may be promoted to NotebookLM only if all answers are yes:
1. Is it founder-readable?
2. Is it scrubbed of sensitive data?
3. Is it useful for synthesis rather than execution?
4. Does it reflect current repo truth?
5. Is there a clear Drive destination and owner?

If any answer is no, it stays out.

---

## Examples of good NotebookLM sources
- architecture summaries
- content governance docs
- sprint summaries
- admin dashboard overview docs
- export pipeline specs
- implementation packs after normalization

---

## Examples of bad NotebookLM sources
- raw runtime exports
- direct SQL or migration files
- logs with identifiers
- internal debug output
- unreviewed AI syntheses

---

## Critical rule

NotebookLM is a synthesis layer, not a system-of-record layer.

Promotion should always favor clarity, safety, and usefulness over volume.
