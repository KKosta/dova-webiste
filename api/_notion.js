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

export async function saveToNotion({ flow, answers }, { token, dataSourceId = DEFAULT_DATA_SOURCE_ID, fetchImpl = fetch } = {}) {
  const r = await fetchImpl('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify({ parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties: toNotionProperties(flow, answers) }),
  });
  if (!r.ok) throw new Error(`Notion responded ${r.status}: ${(await r.text()).slice(0, 500)}`);
}
