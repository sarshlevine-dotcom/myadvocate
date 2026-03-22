# Canonical Registry

This directory is the machine-readable crosswalk for MyAdvocate canonical documents, schemas, and automation exports.

It builds on the existing repo control hierarchy:

1. `SYSTEM.md` — constitutional layer
2. `CLAUDE.md` — engineering operator layer
3. `docs/` — canonical documents by domain
4. `context_registry/` — agent intelligence layer
5. `docs/schemas/` — structured schema layer

## Purpose

The registry exists to prevent parallel truth systems.

Instead of inventing a second documentation structure, automation and founder reports should read from this directory to answer:

- Which canonical documents exist?
- Where do they live in the repo?
- What authority level do they hold?
- Which schema files are linked to them?
- Which domains are repo-backed versus Drive/Notion-only?

## Primary file

- `canonical-index.json` — source of truth for canonical document mapping

## Maintenance rules

- Update this registry when a new MA-* canonical doc is added to the repo
- Update this registry when a repo-backed schema is created
- If a canonical doc lives outside the repo, mark `repo_backed: false`
- If a path is not yet committed in the repo, leave `repo_path` null and include the current location in `external_location`

## Automation usage

Current founder-report automation can scan this directory. Future automation should use `canonical-index.json` to:

- export source-of-truth document lists to Drive
- validate missing canonical docs
- map domain workflows to schemas
- support agent routing and reporting
