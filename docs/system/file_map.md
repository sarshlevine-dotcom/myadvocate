# File Map — Repo / Drive / NotebookLM Ownership

**Status:** Active  
**Last updated:** 2026-03-21

---

## Purpose

This file maps where information belongs in MyAdvocate so documentation, exports, automation, and analysis follow one system.

---

## Ownership by location

| Location | What belongs here | What does not |
|---|---|---|
| `src/` | Product code, routes, server actions, UI components, business logic | Long-form founder docs, export-only summaries |
| `supabase/` | Migrations, seeds, runtime schema support | Narrative planning docs |
| `context_registry/` | Structured agent intelligence JSON registries | End-user content, founder memos, live app data dumps |
| `docs/` | Canonical doctrine, implementation docs, strategy, operations, security, content systems | User PII exports, ad hoc scratch notes that drive no behavior |
| Google Drive | Curated exports, founder review packets, archived board-style docs, approved NotebookLM sources | Canonical engineering truth, migration logic, live app state |
| NotebookLM | Analysis over approved Drive docs | Code execution, live data, raw repository sync |

---

## Repo mapping

### Constitutional / operator layer
- `SYSTEM.md`
- `CLAUDE.md`
- `docs/system/master_context.md`
- `docs/system/file_map.md`
- `docs/system/export_pipeline.md`
- `docs/system/notebooklm_sources.md`

### Product + application layer
- `src/app/`
- `src/components/`
- `src/lib/`
- `src/types/`

### Data + runtime layer
- `supabase/migrations/`
- `supabase/seed/`
- `src/lib/db/`
- `src/lib/supabase/`

### Agent / intelligence layer
- `context_registry/`
- `.claude/agents/`
- `.claude/skills/`
- `config/agent_runtime/`
- `docs/intelligence/`
- `docs/agents/`

### Content + governance layer
- `docs/seo/`
- `docs/security/`
- `docs/social/`
- `content_drafts/`
- `docs/review/`

### Strategy + operating layer
- `docs/pmp/`
- `docs/data/`
- `docs/cost/`
- `docs/context/`

---

## Google Drive mirror categories

These categories should mirror repo reality, not invent a second structure.

| Drive folder | Primary repo sources |
|---|---|
| `01_Strategy_PMP` | `docs/pmp/`, selected `docs/data/`, selected `docs/cost/` |
| `02_System_Architecture` | `SYSTEM.md`, `CLAUDE.md`, `docs/system/`, selected `docs/intelligence/` |
| `03_Product_Operations` | selected `docs/review/`, selected `docs/social/`, selected operational summaries |
| `04_Content_SEO` | `docs/seo/`, selected `content_drafts/` summaries, publishing queue summaries |
| `05_Agent_Intelligence` | selected `docs/agents/`, selected `docs/context/`, selected `docs/intelligence/` |
| `06_Exports_For_NotebookLM` | approved exports only from the categories above |

---

## Export rules

### Must stay canonical in repo
- Anything that changes engineering behavior
- Any workflow spec used by Claude/Cowork or OpenHands
- Any governance or privacy rule
- Any migration-linked implementation doc

### Safe to export downstream
- Founder-ready summaries
- Release notes
- Sprint digests
- Architecture summaries
- SEO cluster summaries
- Agent role summaries
- Approved implementation packs

### Must never export downstream to NotebookLM sources
- User records
- PHI / PII-bearing docs
- Raw SQL exports
- Secrets or environment details
- Internal debug logs

---

## Practical rule

If a file answers the question "what should the system do or how should it be built?" the canonical copy belongs in GitHub.

If a file answers the question "what should the founder review, archive, or ask NotebookLM about?" it may be exported to Drive.
