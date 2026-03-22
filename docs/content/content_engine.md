# Content Engine — MyAdvocate

**Status:** Active  
**Last updated:** 2026-03-21

---

## Purpose

Defines how content is created, validated, stored, and distributed inside MyAdvocate.

This is a system, not a blog.

---

## Core model

The content engine is a **flywheel tied to product + SEO + trust**.

Content is used to:
- acquire users (SEO, Reddit, distribution)
- educate users (YMYL compliant)
- convert users into tool usage
- reinforce authority (EEAT)

---

## Content types

### 1. Pillar pages
High-authority, long-form, citation-heavy

### 2. Cluster content
Supporting SEO pages

### 3. Tool-aligned content
Directly tied to product workflows

### 4. Distribution content
Reddit, social, short-form

---

## Content pipeline

1. Keyword / topic identified
2. Draft generated (AI + templates)
3. EEAT validation
4. Citation check
5. Compliance check (YMYL + SYSTEM.md)
6. Review (clinical / founder if required)
7. Published
8. Performance tracked

---

## Storage

- Drafts: `content_drafts/`
- Final logic: database tables
- Governance: `docs/seo/`, `docs/security/`

---

## Key rules

- Every claim must be defensible
- No speculative legal or medical claims
- No hallucinated citations
- No shortcuts on EEAT

---

## Relationship to product

Content is not separate from product.

It should:
- route users into tools
- reflect actual workflows
- reinforce product authority

---

## Scaling model

Content should scale in clusters, not random volume.

---

## Downstream usage

- Export summaries → Drive
- Approved docs → NotebookLM

---

## Critical insight

Content is part of the product system, not marketing overhead.
