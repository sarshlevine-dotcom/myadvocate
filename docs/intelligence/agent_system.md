# Agent System — MyAdvocate

**Status:** Active conceptual + early implementation  

---

## Purpose

Defines how agent logic, registries, and execution support systems operate within MyAdvocate.

---

## What the agent system is

The agent system is not autonomous AI replacing logic.

It is a **structured support layer** that:
- organizes tasks
- tracks system state
- supports planning and prioritization
- enables scalable execution

---

## Core components

| Component | Location | Role |
|---|---|---|
| Context registry | `context_registry/` | Structured JSON definitions of system state |
| Claude agents | `.claude/agents/` | Execution and reasoning support |
| Skills | `.claude/skills/` | Workflow-specific instruction sets |
| Docs | `docs/intelligence/`, `docs/agents/` | Human-readable system layer |

---

## Agent responsibilities

- interpret system state
- assist with task prioritization
- support execution planning
- generate structured outputs

Agents do not:
- override governance rules
- access restricted data
- act independently without defined boundaries

---

## Relationship to system

Agents sit between:
- raw system data
- execution layers (Claude, OpenHands)

They help translate complexity into action.

---

## Scaling model

Agents should scale in layers:

1. Internal support agents
2. Task automation agents
3. Optional user-facing agents (future)

---

## Critical rule

Agents must respect:
- SYSTEM.md
- CLAUDE.md
- privacy boundaries

They are helpers, not decision-makers.
