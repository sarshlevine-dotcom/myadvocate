/**
 * automation/daily.js — MyAdvocate Daily Automation
 *
 * Runs on a daily cron schedule. Responsibilities:
 *   1. Fetch tasks from the Notion board
 *   2. Sync task status to Supabase metric_events (founder dashboard feed)
 *   3. Generate a brief daily digest via Claude (optional, skip if AI_DIGEST=false)
 *   4. Write a run log entry to Supabase for automation health monitoring
 *
 * Usage:
 *   node automation/daily.js          — run once (manual / cron)
 *   DAILY_RUN=cron node automation/daily.js  — start internal cron scheduler
 *
 * Schedule (when using internal cron): daily at 07:00 local time
 *
 * Setup:
 *   1. Copy .env.example to .env and fill in NOTION_API_KEY + NOTION_TASKS_DB_ID
 *   2. Run: npm install --save-dev @notionhq/client dotenv node-cron
 *   3. Test: node automation/daily.js
 *
 * Model string: claude-sonnet-4-6 (never change without updating CLAUDE.md)
 */

'use strict';

// ─── Load env vars from project root .env ────────────────────────────────────
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ─── Validate required environment variables ──────────────────────────────────
const REQUIRED_ENV = [
  'NOTION_API_KEY',
  'NOTION_TASKS_DB_ID',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[daily.js] Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
        `Copy .env.example to .env and fill in all values.`
    );
  }
}

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
  // Anthropic — NEVER change this string without updating CLAUDE.md
  model: 'claude-sonnet-4-6',
  maxTokens: 512,

  // Cron schedule: daily at 07:00
  cronExpression: '0 7 * * *',

  // Set to 'false' to skip AI digest generation (saves tokens)
  generateDigest: process.env.AI_DIGEST !== 'false',

  // Notion property names — update if your board uses different column names
  notion: {
    titleProperty: 'Name',
    statusProperty: 'Status',
    priorityProperty: 'Priority',
    phaseProperty: 'Phase',
    sprintProperty: 'Sprint',
  },
};

// ─── Lazy-loaded clients (only instantiate if env is valid) ───────────────────
let _notion = null;
let _supabase = null;
let _anthropic = null;

function getNotionClient() {
  if (!_notion) {
    const { Client } = require('@notionhq/client');
    _notion = new Client({ auth: process.env.NOTION_API_KEY });
  }
  return _notion;
}

function getSupabaseClient() {
  if (!_supabase) {
    const { createClient } = require('@supabase/supabase-js');
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _supabase;
}

function getAnthropicClient() {
  if (!_anthropic) {
    const Anthropic = require('@anthropic-ai/sdk');
    _anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// ─── Notion: fetch tasks ──────────────────────────────────────────────────────
async function fetchNotionTasks() {
  const notion = getNotionClient();

  console.log('[daily.js] Fetching tasks from Notion...');

  let allPages = [];
  let cursor;

  do {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_TASKS_DB_ID,
      start_cursor: cursor,
      page_size: 100,
    });
    allPages = allPages.concat(response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  console.log(`[daily.js] Fetched ${allPages.length} tasks from Notion.`);

  return allPages.map((page) => {
    const props = page.properties;
    return {
      notionId: page.id,
      title: extractText(props[CONFIG.notion.titleProperty]),
      status: extractSelect(props[CONFIG.notion.statusProperty]),
      priority: extractSelect(props[CONFIG.notion.priorityProperty]),
      phase: extractSelect(props[CONFIG.notion.phaseProperty]),
      sprint: extractSelect(props[CONFIG.notion.sprintProperty]),
      lastEditedAt: page.last_edited_time,
      url: page.url,
    };
  });
}

// ─── Notion property extractors ───────────────────────────────────────────────
function extractText(prop) {
  if (!prop) return '';
  if (prop.type === 'title') {
    return prop.title?.map((t) => t.plain_text).join('') ?? '';
  }
  if (prop.type === 'rich_text') {
    return prop.rich_text?.map((t) => t.plain_text).join('') ?? '';
  }
  return '';
}

function extractSelect(prop) {
  if (!prop) return null;
  if (prop.type === 'select') return prop.select?.name ?? null;
  if (prop.type === 'status') return prop.status?.name ?? null;
  return null;
}

// ─── Supabase: record metric events ───────────────────────────────────────────
async function recordSyncMetric(tasks) {
  const supabase = getSupabaseClient();

  const tasksByStatus = tasks.reduce((acc, task) => {
    const status = task.status ?? 'unknown';
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});

  const { error } = await supabase.from('metric_events').insert({
    event_type: 'notion_sync',
    event_data: {
      total_tasks: tasks.length,
      by_status: tasksByStatus,
      synced_at: new Date().toISOString(),
    },
  });

  if (error) {
    // Non-fatal — log but don't crash the run
    console.error('[daily.js] Failed to record sync metric:', error.message);
  } else {
    console.log('[daily.js] Sync metric recorded to Supabase.');
  }
}

// ─── Supabase: fetch PMP v19 §8 metrics summary ──────────────────────────────
async function fetchMetricsSummary() {
  const supabase = getSupabaseClient();

  // Yesterday's date (UTC) for daily views
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // First day of current month for monthly views
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);

  async function queryView(viewName, dateColumn, dateValue) {
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .eq(dateColumn, dateValue)
      .maybeSingle();
    if (error) {
      console.warn(`[daily.js] Could not query ${viewName}:`, error.message);
      return null;
    }
    return data;
  }

  const [
    letterCompletion,
    secondNeed,
    takeRate,
    perCaseToSub,
    repeatRate,
    arpu,
    revenueMix,
  ] = await Promise.all([
    queryView('metric_letter_completion_rate', 'day', yesterdayStr),
    queryView('metric_second_need_rate', 'day', yesterdayStr),
    queryView('metric_per_case_take_rate', 'day', yesterdayStr),
    queryView('metric_per_case_to_sub_rate', 'month', monthStart),
    queryView('metric_repeat_rate', 'month', monthStart),
    queryView('metric_blended_arpu', 'month', monthStart),
    queryView('metric_revenue_mix', 'month', monthStart),
  ]);

  return {
    date: yesterdayStr,
    month: monthStart,
    letterCompletionRate: letterCompletion?.completion_rate_pct ?? null,
    secondNeedRate: secondNeed?.second_need_rate_pct ?? null,
    perCaseTakeRate: takeRate?.take_rate_pct ?? null,
    perCaseToSubRate: perCaseToSub?.conversion_rate_pct ?? null,
    repeatRate: repeatRate?.repeat_rate_pct ?? null,
    blendedArpu: arpu?.arpu_dollars ?? null,
    subscriptionRevenuePct: revenueMix?.subscription_pct ?? null,
  };
}

function fmtMetric(value, unit, target) {
  if (value === null || value === undefined) return 'No data yet';
  return `${value}${unit} (target: ${target})`;
}

function buildMetricsSummary(m) {
  return `
## PMP v19 §8 Business Metrics — ${m.date}
1. Letter Completion Rate:       ${fmtMetric(m.letterCompletionRate, '%', '60–80%')}
2. Free-to-Second-Need Rate:     ${fmtMetric(m.secondNeedRate, '%', '10–25%')}
3. Per-Case Take Rate:           ${fmtMetric(m.perCaseTakeRate, '%', '20–40%')}
4. Per-Case → Subscription Rate: ${fmtMetric(m.perCaseToSubRate, '%', '15–25%')} (month ${m.month})
5. Per-Case Repeat Rate:         ${fmtMetric(m.repeatRate, '%', '<15%')} (month ${m.month})
6. Blended ARPU:                 ${fmtMetric(m.blendedArpu, '/mo', '$5–12')} (month ${m.month})
7. Subscription Revenue Mix:     ${fmtMetric(m.subscriptionRevenuePct, '%', '≥75%')} (month ${m.month})`.trim();
}

// ─── Claude: generate daily digest ───────────────────────────────────────────
async function generateDigest(tasks, metrics) {
  if (!CONFIG.generateDigest) {
    console.log('[daily.js] AI digest disabled (AI_DIGEST=false). Skipping.');
    return null;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[daily.js] ANTHROPIC_API_KEY not set — skipping digest generation.');
    return null;
  }

  console.log('[daily.js] Generating daily digest with Claude...');

  const anthropic = getAnthropicClient();

  const pendingTasks = tasks.filter((t) => t.status === 'In Progress' || t.status === 'To Do');
  const doneTasks = tasks.filter((t) => t.status === 'Done');
  const blockedTasks = tasks.filter((t) => t.status === 'Blocked');

  const metricsSummary = metrics ? buildMetricsSummary(metrics) : '(metrics unavailable)';

  const prompt = `You are the MyAdvocate operational assistant. Here is the current task board status:

## In Progress / To Do (${pendingTasks.length} tasks)
${pendingTasks.slice(0, 10).map((t) => `- [${t.priority ?? 'normal'}] ${t.title} (${t.phase ?? 'no phase'})`).join('\n') || '(none)'}

## Blocked (${blockedTasks.length} tasks)
${blockedTasks.map((t) => `- ${t.title}`).join('\n') || '(none)'}

## Completed recently (${doneTasks.length} total done)
${doneTasks.slice(0, 5).map((t) => `- ${t.title}`).join('\n') || '(none)'}

${metricsSummary}

Produce a brief daily digest (max 200 words) covering:
1. What's in flight today
2. Any blockers to flag
3. Yesterday's key metrics vs. targets — flag any metric outside target range
4. One recommended focus area

Keep it concise and actionable. This is a private digest for the founder.`;

  const message = await anthropic.messages.create({
    model: CONFIG.model,
    max_tokens: CONFIG.maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  const digest = message.content[0]?.text ?? '';
  console.log('[daily.js] Digest generated.');
  return digest;
}

// ─── Supabase: log run result ─────────────────────────────────────────────────
async function logRunResult(result) {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('metric_events').insert({
    event_type: 'automation_run',
    event_data: {
      script: 'daily.js',
      status: result.success ? 'success' : 'error',
      tasks_synced: result.taskCount ?? 0,
      error_message: result.error ?? null,
      digest_generated: result.digestGenerated ?? false,
      duration_ms: result.durationMs ?? 0,
      ran_at: new Date().toISOString(),
    },
  });

  if (error) {
    console.error('[daily.js] Failed to write run log:', error.message);
  }
}

// ─── Main run function ────────────────────────────────────────────────────────
async function run() {
  const startTime = Date.now();
  console.log(`\n[daily.js] === Run started at ${new Date().toISOString()} ===`);

  let result = { success: false, taskCount: 0, digestGenerated: false };

  try {
    validateEnv();

    // 1. Fetch tasks from Notion
    const tasks = await fetchNotionTasks();
    result.taskCount = tasks.length;

    // 2. Sync to Supabase metric_events
    await recordSyncMetric(tasks);

    // 3. Fetch PMP v19 §8 business metrics (non-fatal if unavailable)
    let metrics = null;
    try {
      metrics = await fetchMetricsSummary();
      console.log('[daily.js] Metrics summary fetched.');
      console.log('\n─── PMP v19 §8 Metrics ──────────────────────────────────');
      console.log(buildMetricsSummary(metrics));
      console.log('─────────────────────────────────────────────────────────\n');
    } catch (metricsErr) {
      console.warn('[daily.js] Could not fetch metrics (pre-launch?):', metricsErr.message);
    }

    // 4. Optionally generate daily digest
    const digest = await generateDigest(tasks, metrics);
    result.digestGenerated = !!digest;

    if (digest) {
      console.log('\n─── Daily Digest ────────────────────────────────────────');
      console.log(digest);
      console.log('─────────────────────────────────────────────────────────\n');
    }

    result.success = true;
    console.log(`[daily.js] ✅ Run complete. ${tasks.length} tasks synced.`);
  } catch (err) {
    result.error = err.message;
    console.error('[daily.js] ❌ Run failed:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }
  } finally {
    result.durationMs = Date.now() - startTime;
    // Best-effort log — may also fail if Supabase is unreachable
    try {
      await logRunResult(result);
    } catch (logErr) {
      console.error('[daily.js] Could not write run log:', logErr.message);
    }
  }

  return result;
}

// ─── Entry point ──────────────────────────────────────────────────────────────
if (process.env.DAILY_RUN === 'cron') {
  // Internal cron mode — keep the process alive and schedule
  let nodeCron;
  try {
    nodeCron = require('node-cron');
  } catch {
    console.error(
      '[daily.js] node-cron not installed. Run: npm install --save-dev node-cron\n' +
        'Or run without DAILY_RUN=cron for a one-shot execution.'
    );
    process.exit(1);
  }

  console.log(`[daily.js] Starting cron scheduler (${CONFIG.cronExpression} = daily at 07:00)...`);
  nodeCron.schedule(CONFIG.cronExpression, async () => {
    await run();
  });

  // Also run immediately on startup so you can verify it works
  run();
} else {
  // One-shot mode (default) — run once and exit
  run().then((result) => {
    process.exit(result.success ? 0 : 1);
  });
}
