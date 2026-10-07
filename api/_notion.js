// Writes a waitlist submission as a row in the "Dova.io waitlist signup" Notion database.
// Column names and select options must match the database exactly.

const NOTION_VERSION = '2025-09-03';
// Data source of https://www.notion.so/3f2a7013b5948074bcb5ea4ea3eaa63f
const DEFAULT_DATA_SOURCE_ID = '3f2a7013-b594-8009-aee8-000b6759dfa5';

// Notion select options can't contain commas, so these answers are stored with a reworded label.
const OPTION_LABELS = {
  'Not right now, but have before': 'Not right now but have before',
  'No, looking for one': 'No – looking for one',
  'Working as a team: decisions, stress, money, parenting': 'Working as a team: decisions / stress / money / parenting',
};
const option = (v) => (OPTION_LABELS[v] || String(v)).replace(/,/g, ' /').slice(0, 100);

const text = (v) => ({ rich_text: [{ type: 'text', text: { content: String(v).slice(0, 2000) } }] });
const select = (v) => ({ select: { name: option(v) } });
const multi = (arr) => ({ multi_select: arr.map((v) => ({ name: option(v) })) });
const email = (v) => ({ email: String(v) });

export function toNotionProperties(flow, a) {
  const p = {
    Name: { title: [{ type: 'text', text: { content: String(a.name).slice(0, 2000) } }] },
    Type: select(flow === 'therapists' ? 'Therapist' : 'Couple'),
    Status: select('New'),
    Email: email(a.email),
  };
  const set = (col, key, fn) => { if (a[key] != null && a[key] !== '' && !(Array.isArray(a[key]) && !a[key].length)) p[col] = fn(a[key]); };

  set('Country', 'country', select);
  set('State', 'state', select);
  set('Heard about Dova', 'source', text);
  // Therapists
  set('Years practicing', 'years', select);
  if (a.caseload != null && /^\d+$/.test(String(a.caseload))) p['Couples caseload'] = { number: Number(a.caseload) };
  set('Session fee', 'fee', select);
  set('How couples pay', 'pay', select);
  set('Hardest right now', 'hardest', multi);
  set('Hardest (in their words)', 'hardest_other', text);
  // Couples
  set('Has a therapist', 'therapist', select);
  if (a.referral) p['Reach out to therapist'] = select(a.referral === 'yes' ? 'Yes' : 'Not yet');
  set('Therapist name', 'therapistName', text);
  set('Therapist email', 'therapistEmail', email);
  set('Goals', 'goals', multi);
  set('Goals (in their words)', 'goals_other', text);
  return p;
}

const headers = (token) => ({ Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' });

async function notionError(r) {
  let body = {};
  try { body = await r.json(); } catch {}
  const err = new Error(`Notion responded ${r.status} ${body.code || ''}: ${String(body.message || '').slice(0, 300)}`);
  err.code = body.code || `http_${r.status}`;
  return err;
}

async function createPage(properties, children, { token, dataSourceId, fetchImpl }) {
  const r = await fetchImpl('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties, ...(children ? { children } : {}) }),
  });
  if (!r.ok) throw await notionError(r);
}

export async function saveToNotion({ flow, answers }, { token, dataSourceId = DEFAULT_DATA_SOURCE_ID, fetchImpl = fetch } = {}) {
  const opts = { token, dataSourceId, fetchImpl };
  try {
    await createPage(toNotionProperties(flow, answers), null, opts);
  } catch (err) {
    // If the database's columns were renamed or changed, still keep the signup:
    // save the essentials and put every answer in the page body.
    if (err.code !== 'validation_error') throw err;
    console.error('[waitlist] full row rejected, saving fallback row:', err.message);
    const all = toNotionProperties(flow, answers);
    const core = { Name: all.Name, Email: all.Email };
    const body = [{ object: 'block', type: 'code', code: { language: 'json', rich_text: [{ type: 'text', text: { content: JSON.stringify(answers, null, 2).slice(0, 2000) } }] } }];
    await createPage(core, body, opts);
  }
}

/** Checks the token can see the database, for GET /api/waitlist. Never returns the token. */
export async function checkNotion({ token, dataSourceId = DEFAULT_DATA_SOURCE_ID, fetchImpl = fetch } = {}) {
  if (!token) return { ok: false, problem: 'NOTION_TOKEN is not set in Vercel (or the site was not redeployed after adding it).' };
  if (token !== token.trim()) return { ok: false, problem: 'NOTION_TOKEN has a space or line break at the start or end. Re-paste it in Vercel and redeploy.' };
  const r = await fetchImpl(`https://api.notion.com/v1/data_sources/${dataSourceId}`, { headers: headers(token) });
  if (r.ok) {
    const ds = await r.json();
    const cols = Object.keys(ds.properties || {});
    const missing = ['Name', 'Type', 'Email', 'Status', 'Country', 'Goals', 'Hardest right now'].filter((c) => !cols.includes(c));
    return missing.length ? { ok: false, problem: `Connected, but the database is missing columns: ${missing.join(', ')}` } : { ok: true, database: (ds.title || []).map((t) => t.plain_text).join('') };
  }
  const err = await notionError(r);
  const problem = {
    unauthorized: 'Notion rejected the token. Check NOTION_TOKEN is the integration secret (starts with ntn_ or secret_), then redeploy.',
    object_not_found: 'The token works, but the integration cannot see the waitlist database. In Notion open the database → ••• → Connections → add your integration.',
    restricted_resource: 'The integration lacks access. Give it "Read content" and "Insert content" capabilities, and connect it to the database.',
  }[err.code] || err.message;
  return { ok: false, code: err.code, problem };
}
