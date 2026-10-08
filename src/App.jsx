import React from 'react';
import { Button } from './components/Button.jsx';
import { Input, Select, RadioRows, Checkbox, Eyebrow } from './components/Forms.jsx';
import { COUNTRIES, STATES, FLOWS } from './flows.js';

const EASE = 'cubic-bezier(0.2,0,0,1)';
const NARROW_MQ = '(max-width: 720px)';
const HERO_ALT = 'A couple holding each other, seen from behind';

/* Shared spacing so the wordmark sits in the same spot on the splash page and in the form header. */
const DLG_PAD = 'clamp(0px, 2vw, 24px)';
const HDR_Y = 'clamp(20px, 2.6vw, 32px)';
const HDR_X = 'clamp(24px, 3.4vw, 48px)';
/* Wordmark height: larger on phones. Shared by the splash and form headers so it doesn't move when a form opens. */
const markHeight = (narrow) => (narrow ? 32 : 'clamp(26.4px, 2.64vw, 36px)');

/* Headline: Aimee regular. */
const HEAD = { font: "'Aimee', Georgia, serif", weight: 400, line: 1.14, track: '-0.005em', word: '-0.03em' };

/* Form theme: dark, with Frost glass on the card and solid fields — the settings locked in on the design. */
const DARK = {
  '--dlg-bg': 'rgba(23, 16, 15, 0.94)',
  '--card-shadow': '0 0 0 1px #3A2C29',
  '--canvas': '#201615', '--surface': '#17100F', '--muted': '#2B1F1D', '--border': '#3A2C29',
  '--text-primary': '#F9F8F5', '--text-secondary': '#E4D3CD', '--text-tertiary': '#B8897B', '--eyebrow': '#B8897B',
  '--interactive': '#8FB4A9', '--interactive-ring': '#36443F', '--interactive-soft': '#1F2A26',
  '--focus-ring': '#36443F', '--danger': '#F4A3AB',
  '--disabled-fill': '#4A3A37', '--text-disabled': '#7D6660',
  '--shadow-card': '0 0 0 1px #3A2C29, 0 4px 12px rgba(0, 0, 0, 0.3)',
  '--shadow-panel': '0 0 0 1px #3A2C29, 0 24px 64px rgba(0, 0, 0, 0.5)',
  '--shadow-elev': '0 0 0 1px #4A3A37, 0 6px 20px rgba(0, 0, 0, 0.4)',
};
const FROST = {
  '--dlg-bg': 'rgba(23, 16, 15, 0.28)',
  '--card-bg': 'rgba(32, 22, 21, 0.6)',
  '--card-blur': 'blur(28px) saturate(1.15)',
  '--card-shadow': '0 0 0 1px rgba(249, 248, 245, 0.10), 0 24px 64px rgba(0, 0, 0, 0.35)',
  '--border': 'rgba(249, 248, 245, 0.12)',
};

/* Height of the visible screen with the browser's address bar showing (CSS svh). Stable while the bar slides away. */
let svhProbe;
function svh() {
  if (!svhProbe) {
    svhProbe = document.createElement('div');
    svhProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
    document.body.appendChild(svhProbe);
  }
  return svhProbe.getBoundingClientRect().height || window.innerHeight;
}

/* The header's icon buttons (× and, on phones, ‹ Back): 48px tap target, no box until hover. */
const iconBtn = {
  flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48,
  padding: 0, border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)', cursor: 'pointer',
  transition: 'background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
};

const isEmail = (x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((x || '').trim());
const prefersReduced = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const val = (e) => (e && e.target ? e.target.value : e);

function validate(q, a) {
  const v = a[q.id];
  switch (q.type) {
    case 'text': return q.required && !(v || '').trim() ? (q.empty || 'Add your answer to continue.') : null;
    case 'email': return !isEmail(v) ? ((v || '').trim() ? "That email doesn't look right." : 'Add your email to continue.') : null;
    case 'number':
      if ((v ?? '') === '') return q.required ? 'Enter a number to continue.' : null;
      return /^\d+$/.test(String(v).trim()) ? null : 'Enter a whole number, 0 or more.';
    case 'location': return !a.country ? 'Choose a country to continue.' : null;
    case 'single': return q.required && !v ? 'Choose one to continue.' : null;
    case 'multi': {
      const arr = v || [];
      if (q.required && !arr.length) return 'Choose at least one to continue.';
      if (q.other === 'onSomethingElse' && arr.includes('Something else') && !(a[q.id + '_other'] || '').trim()) return 'Tell us what else, in a few words.';
      return null;
    }
    case 'referral':
      if (v !== 'yes') return null;
      if (!(a.tName || '').trim()) return 'Add their name, or choose "Not yet".';
      return isEmail(a.tEmail) ? null : "Their email doesn't look right.";
    default: return null;
  }
}

/* Only the answers to questions the person actually saw, trimmed, keyed by question id. */
function payload(steps, a) {
  const out = {};
  const put = (k, v) => { if (v == null) return; const t = typeof v === 'string' ? v.trim() : v; if (t !== '' && !(Array.isArray(t) && !t.length)) out[k] = t; };
  for (const q of steps) {
    if (q.type === 'location') { put('country', a.country); put('state', a.state); }
    else if (q.type === 'referral') { put('referral', a.referral); if (a.referral === 'yes') { put('therapistName', a.tName); put('therapistEmail', a.tEmail); } }
    else if (q.type === 'multi') {
      const sel = a[q.id] || [];
      put(q.id, sel);
      if (sel.includes('Something else')) put(q.id + '_other', a[q.id + '_other']);
    } else put(q.id, a[q.id]);
  }
  return out;
}

export default class App extends React.Component {
  state = {
    flow: null, step: 'intro', answers: { therapists: {}, couples: {} }, error: null, submitting: false,
    narrow: typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(NARROW_MQ).matches,
  };

  photoRef = React.createRef(); markRef = React.createRef();
  line1Ref = React.createRef(); line2Ref = React.createRef(); headRef = React.createRef();
  btn1Ref = React.createRef(); btn2Ref = React.createRef();
  flowRef = React.createRef(); stepRef = React.createRef(); cardRef = React.createRef();
  doneCardRef = React.createRef(); doneBadgeRef = React.createRef(); doneCheckRef = React.createRef();
  doneTextRef = React.createRef(); doneActionsRef = React.createRef();

  /* ── flow state ─────────────────────────────────────────────── */
  steps(flow = this.state.flow) {
    const a = this.state.answers[flow] || {};
    return FLOWS[flow].steps.filter((s) => !s.showIf || s.showIf(a));
  }
  current() {
    const { flow, step } = this.state;
    if (!flow || typeof step !== 'number') return null;
    return this.steps()[step] || null;
  }
  ans() { return this.state.answers[this.state.flow] || {}; }
  setAns(patch) {
    const flow = this.state.flow;
    this.setState((s) => ({ error: null, answers: { ...s.answers, [flow]: { ...s.answers[flow], ...patch } } }));
  }

  advance = async () => {
    const { step, flow, submitting } = this.state;
    if (submitting) return;
    if (step === 'intro') return this.setState({ step: 0, error: null });
    const q = this.current(); if (!q) return;
    const err = validate(q, this.ans());
    if (err) return this.setState({ error: err });
    const steps = this.steps();
    if (step + 1 < steps.length) return this.setState({ step: step + 1, error: null });

    this.setState({ submitting: true, error: null });
    try {
      const r = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow, answers: payload(steps, this.ans()) }),
      });
      if (!r.ok) throw new Error('status ' + r.status);
      if (this.state.flow !== flow) return this.setState({ submitting: false });
      this.setState((s) => ({ step: 'done', submitting: false, error: null, answers: { ...s.answers, [flow]: {} } }));
    } catch {
      this.setState({ submitting: false, error: "We couldn't save your answers. Check your connection and try again." });
    }
  };
  back = () => {
    const { step } = this.state;
    if (step === 'intro') return this.closeFlow();
    if (step === 0) return this.setState({ step: 'intro', error: null });
    if (typeof step === 'number') this.setState({ step: step - 1, error: null });
  };
  openFlow = (flow) => this.setState({ flow, step: 'intro', error: null });
  closeFlow = () => { clearTimeout(this._adv); this.setState({ flow: null, step: 'intro', error: null }); };

  formVars() {
    const v = { ...DARK, ...FROST };
    if (this.state.step === 'done') delete v['--dlg-bg'];
    return v;
  }

  /* ── lifecycle ──────────────────────────────────────────────── */
  onKey = (e) => {
    if (e.key !== 'Escape' || !this.state.flow || e.defaultPrevented) return;
    const ae = document.activeElement;
    if (ae && (ae.getAttribute('aria-expanded') === 'true' || ae.closest('[role=listbox]') || document.querySelector('[role=listbox]'))) return;
    this.closeFlow();
  };
  componentDidMount() {
    // Capture phase: runs before the Select's own Esc handler removes its listbox, so an open dropdown is still detectable.
    window.addEventListener('keydown', this.onKey, true);
    if (window.matchMedia) {
      this._mq = window.matchMedia(NARROW_MQ);
      this._onMq = () => this.setState({ narrow: this._mq.matches });
      this._mq.addEventListener('change', this._onMq);
    }
    window.addEventListener('resize', this.fitHeadline);
    this.fitHeadline();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.fitHeadline());
    this.playEntrance();
  }
  componentDidUpdate(_, prevState) {
    if (prevState.narrow !== this.state.narrow) this.fitHeadline();
    const key = this.state.flow ? this.state.flow + ':' + this.state.step : null;
    const prevKey = this._stepKey; this._stepKey = key;
    const wasOpen = this._wasOpen; this._wasOpen = !!this.state.flow;
    document.body.style.overflow = this.state.flow ? 'hidden' : '';
    if (!key || key === prevKey) return;

    // Runs after commit and before paint, so nothing flashes in its final state first.
    const reduced = prefersReduced();
    if (!wasOpen && this.flowRef.current) {
      const flowEl = this.flowRef.current;
      const bg = getComputedStyle(flowEl).backgroundColor;
      flowEl.animate([{ backgroundColor: 'rgba(0, 0, 0, 0)' }, { backgroundColor: bg }], { duration: 240, easing: EASE });
      if (this.cardRef.current) this.cardRef.current.animate(reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: EASE, fill: 'backwards' });
      return;
    }
    if (this.state.step === 'done') {
      const run = (r, frames, duration, delay) => r.current && r.current.animate(frames, { duration, delay, easing: EASE, fill: 'backwards' });
      if (reduced) { run(this.doneCardRef, [{ opacity: 0 }, { opacity: 1 }], 200, 0); return; }
      run(this.doneCardRef, [{ opacity: 0, transform: 'translateY(16px) scale(0.97)' }, { opacity: 1, transform: 'none' }], 320, 0);
      run(this.doneBadgeRef, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1.06)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)' }], 420, 140);
      run(this.doneCheckRef, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 320, 420);
      run(this.doneTextRef, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], 320, 520);
      run(this.doneActionsRef, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], 320, 620);
      return;
    }
    const el = this.stepRef.current; if (!el) return;
    el.animate(reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 200, easing: EASE, fill: 'backwards' });
    const input = el.querySelector('input:not([type=radio]):not([type=hidden]), textarea');
    if (input) input.focus({ preventScroll: true });
    if (this.flowRef.current) this.flowRef.current.scrollTop = 0;
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('resize', this.fitHeadline);
    if (this._mq) this._mq.removeEventListener('change', this._onMq);
    clearTimeout(this._adv);
    clearTimeout(this._entranceFallback);
    document.body.style.overflow = '';
  }

  /* Mobile: scale the headline so its longer line is exactly as wide as the buttons below it.
     Width scales linearly with font size (tracking is in em), so one measurement is exact. */
  fitHeadline = () => {
    const h = this.headRef.current, l1 = this.line1Ref.current, l2 = this.line2Ref.current;
    if (!this.state.narrow || !h || !l1 || !l2) return;
    const widest = Math.max(l1.getBoundingClientRect().width, l2.getBoundingClientRect().width);
    const current = parseFloat(getComputedStyle(l1).fontSize);
    if (!widest || !current) return;
    // …but never taller than ~6% of the visible screen height, so short phones keep room for the photo and buttons.
    const size = Math.min(72, svh() * 0.06, Math.floor(current * (h.clientWidth / widest) * 10) / 10);
    if (Math.abs(size - (this.state.fitSize || 0)) > 0.2) this.setState({ fitSize: size });
  };

  /* Couple → Dova → headline → buttons, each beat landing before the next begins. */
  playEntrance() {
    const refs = [this.photoRef, this.markRef, this.line1Ref, this.line2Ref, this.btn1Ref, this.btn2Ref];
    if (!refs.every((r) => r.current)) return;
    const all = refs.map((r) => r.current);
    const [photo, mark, l1, l2, b1, b2] = all;
    const run = (el, frames, duration, delay) => el.animate(frames, { duration, delay, easing: EASE, fill: 'backwards' });
    const fade = [{ opacity: 0 }, { opacity: 1 }];
    const rise = (y) => [{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'translateY(0)' }];
    let started = false;
    const start = () => {
      if (started) return; started = true;
      clearTimeout(this._entranceFallback);
      all.forEach((el) => { el.style.opacity = ''; });
      if (prefersReduced()) { all.forEach((el) => run(el, fade, 200, 0)); return; }
      run(photo, [{ opacity: 0, transform: 'scaleX(-1) scale(1.03)' }, { opacity: 1, transform: 'scaleX(-1) scale(1)' }], 900, 0);
      run(mark, fade, 400, 550);
      run(l1, rise(12), 500, 800);
      run(l2, rise(12), 500, 880);
      run(b1, rise(8), 400, 1180);
      run(b2, rise(8), 400, 1300);
    };
    if (photo.complete && photo.naturalWidth) start();
    else {
      // Nothing shows until the photo is in, so the order holds on slow connections.
      all.forEach((el) => { el.style.opacity = '0'; });
      photo.addEventListener('load', start, { once: true });
      photo.addEventListener('error', start, { once: true });
      this._entranceFallback = setTimeout(start, 4000);
    }
  }

  onSingle = (q, v) => {
    this.setAns({ [q.id]: val(v) });
    // Auto-advance: picking an answer moves on.
    clearTimeout(this._adv);
    const at = this.state.step;
    this._adv = setTimeout(() => { if (this.state.step === at) this.advance(); }, 260);
  };

  /* ── render ─────────────────────────────────────────────────── */
  renderHero() {
    const { narrow } = this.state;
    const pic = (style) => (
      <picture>
        <source srcSet="/assets/dova-hero.webp" type="image/webp" />
        <img ref={this.photoRef} src="/assets/dova-hero.jpg" alt={HERO_ALT} style={style} />
      </picture>
    );
    return narrow
      ? pic({ position: 'absolute', top: '10%', left: 0, width: '100%', height: '62%', objectFit: 'cover', objectPosition: '28% 30%', transform: 'scaleX(-1)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 14%, #000 64%, transparent 100%)', maskImage: 'linear-gradient(to bottom, transparent 0, #000 14%, #000 64%, transparent 100%)' })
      : pic({ position: 'absolute', top: 0, right: 0, height: '100%', width: 'auto', maxWidth: 'none', transform: 'scaleX(-1)', WebkitMaskImage: 'linear-gradient(to left, transparent 0, #000 18%)', maskImage: 'linear-gradient(to left, transparent 0, #000 18%)' });
  }

  renderQuestion(q) {
    const { error } = this.state;
    const a = this.ans();
    const t = q.type;
    const multiSel = t === 'multi' ? (a[q.id] || []) : [];
    const atMax = t === 'multi' && multiSel.length >= q.max;
    const helperLine = [q.helper, t === 'multi' ? `${multiSel.length} of ${q.max} chosen.` : ''].filter(Boolean).join(' ');
    const showGroupError = !!error && (t === 'single' || t === 'multi' || t === 'referral');

    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h1 style={{ margin: 0, fontFamily: HEAD.font, fontWeight: 400, fontSize: 'clamp(30px, 3.2vw, 40px)', lineHeight: 1.18, letterSpacing: '0.05em', wordSpacing: '-0.03em', color: 'var(--text-primary)', textWrap: 'balance', width: '100%' }}>{q.title}</h1>
          {q.helper && <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.55, color: 'var(--text-secondary)' }}>{helperLine}</p>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(t === 'text' || t === 'email' || t === 'number') && (
            <Input
              key={q.id}
              type={t === 'email' ? 'email' : 'text'}
              value={a[q.id] ?? ''}
              onChange={(e) => this.setAns({ [q.id]: val(e) })}
              placeholder={q.placeholder || ''}
              aria-label={q.title}
              autoComplete={q.autoComplete || 'off'}
              inputMode={t === 'number' ? 'numeric' : t === 'email' ? 'email' : 'text'}
              error={error || undefined}
            />
          )}

          {t === 'location' && (
            <>
              <Select label="Country" options={COUNTRIES} value={a.country ?? null}
                onChange={(v) => this.setAns({ country: val(v), state: val(v) === 'United States' ? a.state : null })}
                searchable searchPlaceholder="Search countries" placeholder="Choose a country" error={error || undefined} />
              {a.country === 'United States' && (
                <Select label="State" helper="Optional" options={STATES} value={a.state ?? null}
                  onChange={(v) => this.setAns({ state: val(v) })}
                  searchable searchPlaceholder="Search states" placeholder="Choose a state" />
              )}
            </>
          )}

          {t === 'single' && (
            <RadioRows name={q.id} options={q.options.map((o) => ({ value: o, title: o }))} value={a[q.id] ?? null} onChange={(v) => this.onSingle(q, v)} />
          )}

          {t === 'multi' && (
            <>
              <div role="group" aria-label={q.title} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((o) => {
                  const checked = multiSel.includes(o);
                  const disabled = !checked && atMax;
                  const toggle = () => { if (!disabled) this.setAns({ [q.id]: checked ? multiSel.filter((x) => x !== o) : [...multiSel, o] }); };
                  return (
                    <div key={o} onClick={toggle} style={{
                      display: 'flex', alignItems: 'center', padding: 16, borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${checked ? 'var(--interactive)' : 'var(--field-bd, var(--border))'}`,
                      background: checked ? 'var(--interactive-soft)' : 'var(--field-bg, var(--surface))',
                      opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
                      transition: 'border-color var(--dur-base) var(--ease-out), background-color var(--dur-base) var(--ease-out)',
                    }}>
                      <Checkbox checked={checked} disabled={disabled} label={o} style={{ width: '100%' }} />
                    </div>
                  );
                })}
              </div>
              {multiSel.includes('Something else') && (
                <Input label={q.otherLabel || ''} helper={q.otherHelper || ''} value={a[q.id + '_other'] || ''} onChange={(e) => this.setAns({ [q.id + '_other']: val(e) })} />
              )}
            </>
          )}

          {t === 'referral' && (
            <>
              <RadioRows name="referral" options={[{ value: 'yes', title: "Yes, here's their name and email" }, { value: 'later', title: 'Not yet' }]} value={a.referral ?? null} onChange={(v) => this.setAns({ referral: val(v) })} />
              {a.referral === 'yes' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <Input label="Their name" value={a.tName || ''} onChange={(e) => this.setAns({ tName: val(e) })} />
                  <Input label="Their email" type="email" value={a.tEmail || ''} onChange={(e) => this.setAns({ tEmail: val(e) })} />
                </div>
              )}
            </>
          )}

          {showGroupError && <p role="alert" style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.5, color: 'var(--danger)' }}>{error}</p>}
        </div>
      </>
    );
  }

  renderFlow() {
    const { flow, step, submitting } = this.state;
    const F = FLOWS[flow];
    const steps = this.steps();
    const n = steps.length;
    const q = this.current();
    const a = this.ans();
    const isDone = step === 'done';
    const pct = isDone ? 100 : step === 'intro' ? 0 : Math.round((step / n) * 100);
    const optional = q && !q.required && q.type !== 'email';
    const empty = q ? (q.type === 'multi' ? !(a[q.id] || []).length : q.type === 'referral' ? !a.referral : !String(a[q.id] ?? '').trim()) : false;
    const continueLabel = optional && empty ? 'Skip' : (q && step === n - 1 ? 'Finish' : 'Continue');

    return (
      <div ref={this.flowRef} role="dialog" aria-modal="true" aria-label={F.label} style={{
        ...this.formVars(),
        position: 'fixed', inset: 0, zIndex: 50, background: 'var(--dlg-bg, rgba(20, 20, 15, 0.4))',
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', overflowY: 'auto',
        padding: DLG_PAD, boxSizing: 'border-box', color: 'var(--text-primary)',
      }}>
        {!isDone && (
          <div ref={this.cardRef} style={{
            flex: '1 0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
            background: 'var(--card-bg, var(--canvas))', WebkitBackdropFilter: 'var(--card-blur, none)', backdropFilter: 'var(--card-blur, none)',
            borderRadius: 'var(--radius-xl)', boxShadow: 'var(--card-shadow, var(--shadow-card))', overflow: 'clip',
          }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 2, height: 3, flexShrink: 0 }}>
              <div data-testid="progress" style={{ height: '100%', width: pct + '%', background: 'var(--cta)', transition: 'width var(--dur-base) var(--ease-out)' }} />
            </div>
            <header style={{ display: 'grid', gridTemplateColumns: this.state.narrow ? '1fr auto 1fr' : '1fr auto', alignItems: 'center', gap: 16, padding: `${HDR_Y} ${HDR_X}`, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {/* Phones: Back lives here, top left, instead of in the footer. Hidden on the intro, where the × already closes. */}
              {this.state.narrow && (step === 'intro' ? <span aria-hidden="true" /> : (
                <button type="button" aria-label="Back" className="dova-close" onClick={this.back} style={{ ...iconBtn, justifySelf: 'start', margin: '-9px 0 -9px -8px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 32, height: 32 }}><path d="M15 6l-6 6 6 6" /></svg>
                </button>
              ))}
              <img src="/assets/dova-wordmark-light.svg" alt="Dova" style={{ display: 'block', height: markHeight(this.state.narrow), width: 'auto' }} />
              <button type="button" aria-label="Close" className="dova-close" onClick={this.closeFlow} style={{ ...iconBtn, justifySelf: 'end', margin: '-9px -8px -9px 0' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 32, height: 32 }}><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </header>
            <form noValidate onSubmit={(e) => { e.preventDefault(); this.advance(); }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', padding: `clamp(48px, 11vh, 120px) ${HDR_X} 64px` }}>
                <div ref={this.stepRef} style={{ width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 32 }}>
                  {step === 'intro' ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Eyebrow>{F.label}</Eyebrow>
                        <h1 style={{ margin: 0, fontFamily: HEAD.font, fontWeight: 400, fontSize: 'clamp(36px, 4.4vw, 52px)', lineHeight: 1.12, letterSpacing: '-0.005em', wordSpacing: '-0.03em', color: 'var(--text-primary)', textWrap: 'balance' }}>{F.introTitle}</h1>
                        <p style={{ margin: 0, maxWidth: '52ch', fontFamily: 'var(--font-sans)', fontSize: 18, lineHeight: 1.55, color: 'var(--text-secondary)', textWrap: 'pretty', fontWeight: 300 }}>{F.introBody}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
                        <Button variant="primary" size="xl" type="submit">Join the waitlist</Button>
                        {F.introNote && <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>{F.introNote}</p>}
                      </div>
                    </>
                  ) : q && (
                    <>
                      {this.renderQuestion(q)}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Button variant="primary" size="xl" type="submit" disabled={submitting} aria-busy={submitting || undefined}>{continueLabel}</Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {!this.state.narrow && (
                <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: `20px ${HDR_X}`, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', marginLeft: -24 }}>
                    <Button variant="ghost" size="lg" onClick={this.back}>Back</Button>
                  </div>
                </footer>
              )}
            </form>
          </div>
        )}

        {isDone && (
          <div style={{ flex: '1 0 auto', alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px clamp(8px, 3vw, 24px)' }}>
            <div ref={this.doneCardRef} style={{
              position: 'relative', width: '100%', maxWidth: 440, boxSizing: 'border-box', background: 'var(--canvas)', borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-panel)', padding: '48px 40px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 24,
            }}>
              <div ref={this.doneBadgeRef} style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--cta)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 48, height: 48 }}>
                  <path ref={this.doneCheckRef} d="M6.5 12.5l3.5 3.5L17.5 8.5" stroke="var(--on-cta)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="0" />
                </svg>
              </div>
              <div ref={this.doneTextRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <h2 style={{ margin: 0, fontFamily: HEAD.font, fontWeight: 400, fontSize: 34, lineHeight: 1.15, letterSpacing: '-0.005em', wordSpacing: '-0.03em', color: 'var(--text-primary)' }}>You’re on the list.</h2>
                <p style={{ margin: 0, maxWidth: '34ch', fontFamily: 'var(--font-sans)', fontSize: 16, lineHeight: 1.55, color: 'var(--text-secondary)', textWrap: 'pretty' }}>{F.doneBody}</p>
              </div>
              <div ref={this.doneActionsRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <Button variant="outline" size="xl" onClick={this.closeFlow}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  render() {
    const { narrow, flow, fitSize } = this.state;
    const sideX = `calc(${DLG_PAD} + ${HDR_X})`;
    const narrowBtn = narrow ? { padding: '0 12px', fontSize: 'clamp(15px, 4.4vw, 18px)' } : undefined;
    const line = narrow
      // Mobile: centred, sized so the longer line spans the same width as the buttons.
      ? { display: 'block', width: 'fit-content', margin: '0 auto', fontWeight: HEAD.weight, fontSize: fitSize ? fitSize + 'px' : 'clamp(34px, 6.4vw, 72px)', whiteSpace: 'nowrap' }
      : { display: 'block', fontWeight: HEAD.weight, fontSize: 'clamp(34px, 6.4vw, 72px)', whiteSpace: 'nowrap' };

    return (
      <main className="dova-main" style={{ position: 'relative', overflow: 'hidden', background: '#3C090C', display: 'flex', flexDirection: 'column' }}>
        {this.renderHero()}

        <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: narrow ? 'center' : 'flex-start', gap: 12, minHeight: 30, padding: `calc(${DLG_PAD} + 3px + ${HDR_Y}) ${sideX} ${HDR_Y}` }}>
          <img ref={this.markRef} src="/assets/dova-wordmark-light.svg" alt="Dova" style={{ display: 'block', height: markHeight(narrow), width: 'auto' }} />
        </header>

        <section style={{ position: 'relative', flex: 1, display: 'flex', alignItems: narrow ? 'flex-end' : 'center', justifyContent: 'flex-start', padding: `0 ${sideX} ${narrow ? 'calc(clamp(20px, 4svh, 40px) + env(safe-area-inset-bottom, 0px))' : 'clamp(40px, 10vh, 120px)'}` }}>
          <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: narrow ? 'clamp(16px, 3.2svh, 28px)' : 40 }}>
            <h1 ref={this.headRef} style={{
              margin: 0, textAlign: narrow ? 'center' : 'left', fontFamily: HEAD.font, fontWeight: 500, fontSize: 'clamp(40px, 5.4vw, 72px)', lineHeight: HEAD.line, letterSpacing: HEAD.track, wordSpacing: HEAD.word,
              fontKerning: 'normal', fontFeatureSettings: "'kern' 1, 'liga' 1", textRendering: 'optimizeLegibility', color: 'var(--text-on-dark)', textWrap: 'balance',
            }}>
              <span ref={this.line1Ref} style={line}>A New Partner for</span>
              <span ref={this.line2Ref} style={line}>Couples’ Therapy.</span>
            </h1>
            {/* Phones: side by side, sharing the width equally; label and padding shrink so both fit down to 320px. */}
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: narrow ? 'nowrap' : 'wrap', gap: narrow ? 10 : 12 }}>
              <div ref={this.btn1Ref} style={{ display: 'flex', flexDirection: 'column', flex: narrow ? '1 1 0' : undefined, minWidth: 0 }}>
                <Button variant="primary" size="xl" full={narrow} style={narrowBtn} onClick={() => this.openFlow('therapists')}>For therapists</Button>
              </div>
              <div ref={this.btn2Ref} style={{ display: 'flex', flexDirection: 'column', flex: narrow ? '1 1 0' : undefined, minWidth: 0 }}>
                <Button variant="inverse" size="xl" full={narrow} style={narrowBtn} onClick={() => this.openFlow('couples')}>For couples</Button>
              </div>
            </div>
          </div>
        </section>

        {flow && this.renderFlow()}
      </main>
    );
  }
}
