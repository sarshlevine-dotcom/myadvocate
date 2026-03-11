# MyAdvocate Automation

Background automation scripts that run outside the Next.js app.

---

## daily.js — Notion → Supabase Sync

**What it does:**
1. Fetches all tasks from the Notion task board
2. Records a `notion_sync` metric event in Supabase (powers the founder dashboard feed)
3. Optionally generates a brief daily digest via Claude (`claude-sonnet-4-6`)
4. Logs each run result as an `automation_run` metric event

**Setup (one-time):**

```bash
# 1. Install automation dependencies
npm install --save-dev @notionhq/client dotenv node-cron

# 2. Add Notion credentials to .env (see .env.example)
#    NOTION_API_KEY=secret_...
#    NOTION_TASKS_DB_ID=your-database-id

# 3. Test a one-shot run
node automation/daily.js
```

**Running:**

```bash
# One-shot (manual or called by external cron)
node automation/daily.js

# Internal cron mode (keeps process alive, runs daily at 07:00)
DAILY_RUN=cron node automation/daily.js

# Disable AI digest generation (saves Claude tokens)
AI_DIGEST=false node automation/daily.js
```

**Vercel Cron (recommended for production):**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 7 * * *"
    }
  ]
}
```

Then create `src/app/api/cron/daily/route.ts` that calls the sync logic directly using the shared Supabase service client.

**Troubleshooting:**

| Error | Fix |
|---|---|
| `Missing required environment variables` | Check `.env` — all vars in `.env.example` must be set |
| `node-cron not installed` | Run `npm install --save-dev node-cron` |
| `notionhq/client not installed` | Run `npm install --save-dev @notionhq/client` |
| Notion returns 0 tasks | Verify `NOTION_TASKS_DB_ID` matches the URL of your database |
| Claude errors | Verify `ANTHROPIC_API_KEY` is valid at console.anthropic.com |
