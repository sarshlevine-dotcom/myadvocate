# NotebookLM Source Policy

**Status:** Active

---

## Purpose

Defines what NotebookLM is allowed to read and how it should be used in MyAdvocate.

---

## Role of NotebookLM

NotebookLM is a **read-only analysis layer**.

It is used for:
- synthesis
- questioning
- summarization
- founder decision support

It is NOT used for:
- coding
- execution
- database access
- real-time system monitoring

---

## Allowed sources

Only from Google Drive folder:

`06_Exports_For_NotebookLM`

---

## Approved document types

- architecture summaries
- system maps
- sprint summaries
- SEO/content strategy docs
- agent hierarchy summaries
- implementation packs
- founder memos

---

## Forbidden sources

- user data
- PHI / PII
- logs
- DB exports
- secrets
- environment configs

---

## Usage patterns

### Founder queries
- "What are my biggest bottlenecks?"
- "What is missing before launch?"
- "Where are dependencies breaking?"

### Strategy queries
- "Which content clusters should scale next?"
- "What are monetization gaps?"

### System understanding
- "Explain my architecture simply"
- "Summarize agent roles"

---

## Feedback loop

1. NotebookLM generates insight
2. Founder reviews
3. Claude converts insight → repo changes

---

## Critical rule

NotebookLM should never become a second brain that replaces the repo.

It exists to **improve decisions**, not to store truth.
