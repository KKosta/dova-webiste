// Vercel serverless function: POST /api/waitlist
// Validates a finished waitlist submission and forwards it to WAITLIST_WEBHOOK_URL.
// Without a webhook configured, the submission is written to the function log only.

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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
  const hook = process.env.WAITLIST_WEBHOOK_URL;

  if (!hook) {
    console.log('[waitlist] submission (no WAITLIST_WEBHOOK_URL set):', JSON.stringify(entry));
    return send(res, 200, { ok: true });
  }

  try {
    const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    if (!r.ok) throw new Error('webhook responded ' + r.status);
    return send(res, 200, { ok: true });
  } catch (err) {
    console.error('[waitlist] forward failed:', err.message, JSON.stringify(entry));
    return send(res, 502, { ok: false, error: 'Could not save submission' });
  }
}
