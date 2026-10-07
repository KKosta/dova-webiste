// Vercel serverless function: POST /api/waitlist
// Validates a finished waitlist submission, then saves it to the Notion waitlist database
// (NOTION_TOKEN) and/or forwards it to WAITLIST_WEBHOOK_URL. With neither set, it is only logged.

import { saveToNotion, checkNotion } from './_notion.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FLOWS = new Set(['therapists', 'couples']);
const MAX_BYTES = 16 * 1024;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BYTES) throw new Error('too large');
  }
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  // GET /api/waitlist: a status check that says whether Notion is connected (no data is written).
  if (req.method === 'GET') {
    const notion = await checkNotion({ token: process.env.NOTION_TOKEN, dataSourceId: process.env.NOTION_DATA_SOURCE_ID || undefined }).catch((e) => ({ ok: false, problem: e.message }));
    return send(res, notion.ok ? 200 : 500, { notion, webhook: Boolean(process.env.WAITLIST_WEBHOOK_URL) });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  }

  let body;
  try { body = await readBody(req); } catch { return send(res, 400, { ok: false, error: 'Invalid body' }); }

  const { flow, answers } = body || {};
  if (!FLOWS.has(flow) || !answers || typeof answers !== 'object') return send(res, 400, { ok: false, error: 'Invalid submission' });
  if (!String(answers.name || '').trim()) return send(res, 400, { ok: false, error: 'Name is required' });
  if (!EMAIL.test(String(answers.email || '').trim())) return send(res, 400, { ok: false, error: 'Email is invalid' });
  if (JSON.stringify(answers).length > MAX_BYTES) return send(res, 413, { ok: false, error: 'Too large' });

  const entry = { flow, submittedAt: new Date().toISOString(), answers };
  const { NOTION_TOKEN, NOTION_DATA_SOURCE_ID, WAITLIST_WEBHOOK_URL } = process.env;
  const sinks = [];
  if (NOTION_TOKEN) sinks.push(['notion', () => saveToNotion(entry, { token: NOTION_TOKEN, dataSourceId: NOTION_DATA_SOURCE_ID || undefined })]);
  if (WAITLIST_WEBHOOK_URL) sinks.push(['webhook', async () => {
    const r = await fetch(WAITLIST_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    if (!r.ok) throw new Error('webhook responded ' + r.status);
  }]);

  if (!sinks.length) {
    console.log('[waitlist] submission (no NOTION_TOKEN or WAITLIST_WEBHOOK_URL set):', JSON.stringify(entry));
    return send(res, 200, { ok: true });
  }

  const results = await Promise.allSettled(sinks.map(([, run]) => run()));
  const failed = results.map((r, i) => [sinks[i][0], r]).filter(([, r]) => r.status === 'rejected');
  if (failed.length) {
    for (const [name, r] of failed) console.error(`[waitlist] ${name} failed:`, r.reason && r.reason.message, JSON.stringify(entry));
    // Saved somewhere is good enough; only fail the person if nothing took it.
    if (failed.length === sinks.length) return send(res, 502, { ok: false, error: 'Could not save submission' });
  }
  return send(res, 200, { ok: true });
}
