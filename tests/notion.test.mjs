// Checks the Notion mapping without calling Notion: every answer either form can produce
// must land on a column and select option that exists in the database.
// Usage: node tests/notion.test.mjs
import assert from 'node:assert/strict';
import { FLOWS } from '../src/flows.js';
import { toNotionProperties, saveToNotion } from '../api/_notion.js';

// Select / multi-select options as set up in the "Dova.io waitlist signup" database.
const DB = {
  Type: ['Therapist', 'Couple'],
  Status: ['New', 'Contacted', 'Onboarded', 'Not a fit'],
  'Years practicing': ['Pre-licensed or associate', '1 to 5 years', '6 to 10 years', '11 to 15 years', '15+ years'],
  'Session fee': ['Under $150', '$150 to $250', '$250 to $350', 'Over $350', 'Rather not say'],
  'How couples pay': ['Private pay', 'A mix', 'Mostly insurance'],
  'Hardest right now': ['Keeping both partners engaged', 'Staying even-handed when one partner pushes harder', 'Couples dropping out early', 'Fitting the work into the hour', 'Knowing whether the work is helping', 'Notes and admin', 'Something else'],
  'Has a therapist': ['Yes', 'Not right now but have before', 'No – looking for one', 'Not sure yet'],
  'Reach out to therapist': ['Yes', 'Not yet'],
  Goals: ['Communicating and handling conflict better', 'Feeling closer', 'Feeling appreciated and understood', 'Rebuilding trust', 'Working as a team: decisions / stress / money / parenting', 'Bringing back intimacy', 'Having more fun together', 'Something else'],
};
const COLUMNS = ['Name', 'Type', 'Email', 'Status', 'Country', 'State', 'Heard about Dova', 'Years practicing', 'Couples caseload', 'Session fee', 'How couples pay', 'Hardest right now', 'Hardest (in their words)', 'Has a therapist', 'Reach out to therapist', 'Therapist name', 'Therapist email', 'Goals', 'Goals (in their words)'];
const COL_FOR = { years: 'Years practicing', fee: 'Session fee', pay: 'How couples pay', hardest: 'Hardest right now', therapist: 'Has a therapist', goals: 'Goals' };

let n = 0;
const check = (props) => {
  for (const [col, v] of Object.entries(props)) {
    assert.ok(COLUMNS.includes(col), `unknown column ${col}`);
    const names = v.select ? [v.select.name] : v.multi_select ? v.multi_select.map((o) => o.name) : null;
    if (names && DB[col]) for (const name of names) assert.ok(DB[col].includes(name), `"${name}" is not an option of ${col}`);
    if (names) for (const name of names) assert.ok(!name.includes(','), `comma in option "${name}"`);
  }
  n++;
};

// Every option of every choice question, in both flows.
for (const [flow, F] of Object.entries(FLOWS)) {
  for (const q of F.steps.filter((s) => s.options)) {
    assert.ok(COL_FOR[q.id], `no column mapped for ${flow}.${q.id}`);
    for (const o of q.options) check(toNotionProperties(flow, { name: 'x', email: 'x@y.co', [q.id]: q.type === 'multi' ? [o] : o }));
  }
}

// A full therapist and couple submission.
const t = toNotionProperties('therapists', { name: 'Ada', email: 'ada@p.com', country: 'United States', state: 'California', years: '6 to 10 years', caseload: '8', fee: '$150 to $250', pay: 'A mix', hardest: ['Notes and admin', 'Something else'], hardest_other: 'Time zones', source: 'Dr. Hopper' });
check(t);
assert.equal(t['Couples caseload'].number, 8);
assert.equal(t.Type.select.name, 'Therapist');
assert.equal(t['Hardest (in their words)'].rich_text[0].text.content, 'Time zones');
const c = toNotionProperties('couples', { name: 'Sam', email: 'sam@e.com', country: 'Ireland', therapist: 'Yes', referral: 'yes', therapistName: 'Dr. Lee', therapistEmail: 'lee@c.com', goals: ['Working as a team: decisions, stress, money, parenting'] });
check(c);
assert.equal(c['Reach out to therapist'].select.name, 'Yes');
assert.equal(c['Therapist email'].email, 'lee@c.com');
assert.ok(!('Years practicing' in c));
assert.equal(toNotionProperties('couples', { name: 'K', email: 'k@e.com', referral: 'later' })['Reach out to therapist'].select.name, 'Not yet');

// The request sent to Notion.
let req;
await saveToNotion({ flow: 'couples', answers: { name: 'Sam', email: 'sam@e.com' } }, { token: 'secret_x', fetchImpl: async (url, init) => { req = { url, init }; return { ok: true }; } });
assert.equal(req.url, 'https://api.notion.com/v1/pages');
assert.equal(req.init.headers.Authorization, 'Bearer secret_x');
assert.equal(req.init.headers['Notion-Version'], '2025-09-03');
assert.deepEqual(JSON.parse(req.init.body).parent, { type: 'data_source_id', data_source_id: '3f2a7013-b594-8009-aee8-000b6759dfa5' });
await assert.rejects(saveToNotion({ flow: 'couples', answers: { name: 'S', email: 's@e.com' } }, { token: 'x', fetchImpl: async () => ({ ok: false, status: 401, text: async () => 'unauthorized' }) }), /401/);

console.log(`✓ Notion mapping: ${n} answer combinations land on real columns and options; request shape OK`);
