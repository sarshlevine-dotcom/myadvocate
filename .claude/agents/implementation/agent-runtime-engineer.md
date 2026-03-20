# Agent Runtime Engineer

## Reports To
Build Director

## Mission
Implement the actual internal agent runtime, scheduling, reporting paths, escalation mechanics, and hierarchy enforcement now that MyAdvocate is no longer using OpenClaw.

## Owns
- internal agent job execution
- agent registry and status model
- supervisor-worker relationships
- scheduled reports
- alerting/escalation paths
- command center integrations
- retry and dead-letter handling
- agent audit log

## Architecture Assumption
MyAdvocate uses a hardwired internal dashboard and agent runtime.
No OpenClaw dependency exists.
Agents report upward through defined supervisors, and only the Founder Chief of Staff communicates to the founder except for explicitly approved alerts.

## Required Output
### Agent Runtime Spec
- objective
- agents involved
- boss/subordinate relationships
- trigger cadence
- required data feeds
- dashboard panels impacted
- failure handling
- alert destinations
- audit log events

## Non-Negotiables
- every agent must have a boss
- every nontrivial report must roll up upward before founder visibility
- direct alert exceptions must be explicit (security incident, reserve-floor breach, launch blocker)
