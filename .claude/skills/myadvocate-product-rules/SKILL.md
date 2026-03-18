# MyAdvocate Product Rules

This skill defines the permanent product boundaries for MyAdvocate. Load this at the start of any build session.

## What MyAdvocate Is
A patient advocacy platform that helps individuals fight insurance denials, dispute medical bills, and understand their healthcare rights. YMYL product — every AI output affects real healthcare decisions.

## Pricing Structure (Non-Negotiable)
- Free tier: 1 letter per case type per year, all /tools/ pages, Denial Decoder
- $8/mo (monthly) — unlimited letters, saved cases, appeal tracking
- $34/yr (Founding Advocate — first 250 subs only, 12-month lock)
- $21/quarter (Advocate Builder)
- Per-case option: $4.99 per letter when not subscribed
- Give a Month / Get a Month referral program (activates at Signal 1)
- DO NOT add new pricing tiers without a formal Decision Log entry

## Phase Gates (Hard Stops)
- Phase 1: V1 core app live. No Phase 2 features, no exceptions.
- Phase 2 unlocks at Signal 1 (10,000 monthly visitors)
- Phase 3 unlocks at Signal 3 (40,000 monthly visitors)
- Custom React owner dashboard unlocks at Level 6 XP + $5,000 MRR
- Do not build Hospital Mode, Problem Severity Router, or Outcome Tracking until their gates are crossed

## What Is Always Free
- Denial Decoder (200+ denial codes, plain-language explanation)
- Local Resource Connector (always free, no API cost)
- Patient rights summaries
- /tools/ SEO landing pages
- One letter per case type per year

## What Should Not Be Built Early
- Hospital Mode (Phase 3 incremental rollout, phased by state)
- Native app (fund required — $50K threshold)
- B2B/union product (Signal 5)
- Predictive analytics (Signal 4+)
- Report Abuse tool (after attorney clears mandated reporter question)
- Custom React owner dashboard (Level 6 XP + $5,000 MRR gate)

## The 6 Canonical Functions
These are the only AI functions in the product. All AI outputs route through one of these:
1. generateAppealLetter()
2. generateDisputeLetter()
3. explainDenialCode()
4. getPatientRights()
5. routeComplaint()
6. generateBillingAnalysis()

Every canonical function MUST be wrapped in trackedExecution() before shipping. This is a launch blocker.

## The generateLetter() Abstraction
All letter generation routes through the generateLetter() abstraction layer.
No feature code makes direct API calls. This enables model switching without touching feature code.

## Tech Stack (Do Not Deviate Without Decision Log Entry)
- Frontend: Next.js on Vercel
- Database: Supabase (Postgres + RLS + Auth + Storage)
- Automation: n8n Pro ($20/mo)
- AI: Claude (primary) → GPT-4 → Gemini (abstraction handles switching)
- Email: Beehiiv
- Payments: Stripe
- Telemetry: Langfuse
- Owner Reporting: Google Sheets (interim — custom React dash deferred to Phase 3+)
- Feature flags: Vercel Flags
- SEO blog: Framer or Webflow

## Authority Order for Conflicts
MA-PMP-001 → MA-ARC-001 → MA-LCH-004 → MA-SEC-002 → MA-DAT-001 → MA-SKL-004 → MA-SEO-002
Unresolved conflicts → founder decision → log in Notion Decision Log (31f2eb8b-e061-8098-9779-000b7c630d50)
