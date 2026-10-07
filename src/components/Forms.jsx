import React from 'react';

/**
 * Dova text input. Surface fill, 1px border, 6px radius, 16px body type.
 * Label sits above; helper text below. Set `multiline` for a textarea, or
 * pass `leadingGlyph`/`trailingText` affixes.
 *
 * Synced to packages/dova-ds/src/TextInput.tsx (Phase 2).
 *
 * THE STATE RAMP ESCALATES rather than wandering:
 *
 *   rest    --border        1.32:1   barely there, which is the point
 *   hover   --interactive   3.07:1   the system acknowledging the cursor
 *   focus   --interactive   5.84:1   you are in this field
 *
 * Hover-to-focus is only 1.90:1 on the border alone, so the RING is what makes
 * the change unmistakable — and its job is PRESENCE, not contrast. Absent-to-
 * present registers instantly in a way a contrast delta does not. The ring
 * stays the pale sage while the border goes deep, so focus is a soft halo
 * around a crisp edge rather than one thick green band. Chasing contrast in the
 * ring would be the wrong target: sage cannot reach 3:1 on white at ANY
 * opacity, so the BORDER carries the accessible signal and the ring is free to
 * be quiet. Error keeps --danger and gains the same ring bump.
 *
 * There was no hover state here before; the code added one.
 */
function Input({
  label,
  helper,
  error,
  id,
  multiline = false,
  rows = 4,
  leadingGlyph = null,
  trailingText = null,
  prefix = null,   /* deprecated alias of leadingGlyph */
  suffix = null,   /* deprecated alias of trailingText */
  disabled = false,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const reactId = React.useId();
  const inputId = id || reactId;
  const hasError = Boolean(error);
  const lead = leadingGlyph || prefix;
  const trail = trailingText || suffix;

  let borderColor = 'var(--field-bd, var(--border))';
  if (hasError) borderColor = 'var(--danger)';
  else if (focus || hover) borderColor = 'var(--interactive)';

  const ring = focus
    ? `0 0 0 3px ${hasError ? 'rgba(161,75,58,0.32)' : 'var(--interactive-ring)'}`
    : 'none';

  const field = {
    display: 'flex',
    alignItems: multiline ? 'flex-start' : 'center',
    gap: 'var(--space-2)',
    background: disabled ? 'var(--muted)' : 'var(--field-bg, var(--surface))',
    backdropFilter: disabled ? undefined : 'var(--field-blur, none)', WebkitBackdropFilter: disabled ? undefined : 'var(--field-blur, none)',
    border: `1px solid ${borderColor}`,
    borderRadius: 'var(--radius-sm)',
    padding: '18px 20px',
    boxShadow: ring,
    transition: 'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
    cursor: disabled ? 'not-allowed' : undefined,
    boxSizing: 'border-box',
  };

  const control = {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    font: 'var(--type-body)',
    lineHeight: multiline ? 1.55 : 1.2,
    color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
    padding: 0,
    resize: multiline ? 'vertical' : undefined,
    width: '100%',
    cursor: 'inherit',
    boxSizing: 'border-box',
  };

  const affix = {
    color: 'var(--text-tertiary)', font: 'var(--type-caption)',
    display: 'inline-flex', alignItems: 'center', flexShrink: 0, pointerEvents: 'none',
  };

  const Control = multiline ? 'textarea' : 'input';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...style }}>
      {label && (
        <label htmlFor={inputId} style={{ font: 'var(--type-label)', color: 'var(--text-primary)' }}>
          {label}
        </label>
      )}
      <div
        style={field}
        onMouseEnter={() => !disabled && setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {lead && <span style={affix}>{lead}</span>}
        <Control
          id={inputId}
          rows={multiline ? rows : undefined}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={control}
          {...rest}
        />
        {trail && <span style={{ ...affix, letterSpacing: '0.04em', fontWeight: 500 }}>{trail}</span>}
      </div>
      {(helper || error) && (
        <span style={{ font: 'var(--type-caption)', color: hasError ? 'var(--danger)' : 'var(--text-tertiary)' }}>
          {error || helper}
        </span>
      )}
    </div>
  );
}


/** Below this, a downward menu is not worth showing and it flips. Roughly the
 *  search box plus a few options — enough to be a list rather than a sliver. */
const MENU_MIN_HEIGHT = 200;

/** Match on label AND value, underscores read as spaces — a therapist types
 *  "los angeles", the IANA id is "America/Los_Angeles". */
function matchesQuery(option, query) {
  const haystack = `${option.label} ${option.value}`.replace(/_/g, ' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((t) => haystack.includes(t));
}

/**
 * Dova select — a custom dropdown (button trigger + floating listbox), never
 * native. The trigger wears the SAME state ramp as TextInput: rest --border,
 * hover --interactive, open --interactive + a 3px --interactive-ring, caret
 * rotated 180°. Options hover --muted; the selected row is --interactive-soft
 * with a --cta check.
 *
 * Synced to packages/dova-ds/src/Select.tsx (Phase 2).
 *
 * `group` and `searchable` exist for long option sets (the IANA timezone list
 * is ~400 entries). This is a custom listbox, so it has none of a native
 * <select>'s type-to-jump — without a filter a long list is only scrollable,
 * which is why `searchable` is opt-in rather than length-triggered: the caller
 * knows when its list has outgrown scrolling. Options render in the order
 * given — the caller groups them; the menu only draws the headers.
 *
 * `bare` drops the trigger's own chrome when the dropdown is EMBEDDED in a
 * control that already draws a box, so a bordered trigger does not nest a box
 * inside a box. The menu is unchanged: the whole point is that an embedded
 * picker still gets the DS dropdown rather than the browser's.
 *
 * ⚠️ Divergence: the product PORTALS the menu to document.body with
 * viewport-fixed positioning — the only way to escape a modal body's
 * `overflow-y-auto` and render above pinned footers. This mirror positions
 * absolutely and only flips up when there is no room below.
 */
function Select({
  label,
  helper,
  error,
  id,
  options = [],
  value,
  onChange = null,
  defaultValue = null,
  defaultOpen = false,
  placeholder = 'Select…',
  disabled = false,
  ariaLabel,
  searchable = false,
  searchPlaceholder = 'Search…',
  bare = false,
  renderTrigger,
  style = {},
  ...rest
}) {
  const reactId = React.useId();
  const selId = id || reactId;
  const hasError = Boolean(error);

  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const controlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const current = controlled ? value : internal;
  const selected = norm.find((o) => o.value === current) || null;

  const [open, setOpen] = React.useState(defaultOpen);
  const [hover, setHover] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [flip, setFlip] = React.useState(false);
  const rootRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const searchRef = React.useRef(null);

  const visible = searchable && query ? norm.filter((o) => matchesQuery(o, query)) : norm;
  const [activeIdx, setActiveIdx] = React.useState(0);

  React.useEffect(() => {
    if (!open) { setQuery(''); setFlip(false); return; }
    const i = visible.findIndex((o) => o.value === current);
    setActiveIdx(i >= 0 ? i : 0);
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setFlip(window.innerHeight - r.bottom < MENU_MIN_HEIGHT && r.top > window.innerHeight - r.bottom);
    }
    if (searchable && searchRef.current) searchRef.current.focus();
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = (opt) => {
    if (!controlled) setInternal(opt.value);
    if (onChange) onChange(opt.value);
    setOpen(false);
    if (triggerRef.current) triggerRef.current.focus();
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(visible.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' || (e.key === ' ' && !searchable)) { e.preventDefault(); if (visible[activeIdx]) commit(visible[activeIdx]); }
  };

  let borderColor = 'var(--field-bd, var(--border))';
  if (hasError) borderColor = 'var(--danger)';
  else if (open || (hover && !disabled)) borderColor = 'var(--interactive)';
  const ring = open
    ? `0 0 0 3px ${hasError ? 'rgba(161,75,58,0.32)' : 'var(--interactive-ring)'}`
    : 'none';

  const chrome = bare ? {
    border: 'none', background: 'transparent', padding: 0, width: 'auto', boxShadow: 'none',
  } : {
    border: `1px solid ${borderColor}`,
    background: disabled ? 'var(--muted)' : 'var(--field-bg, var(--surface))',
    backdropFilter: disabled ? undefined : 'var(--field-blur, none)', WebkitBackdropFilter: disabled ? undefined : 'var(--field-blur, none)',
    padding: '18px 20px',
    width: '100%',
    boxShadow: ring,
  };

  let lastGroup = null;

  return (
    <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...style }}>
      {label && (
        <label htmlFor={selId} style={{ font: 'var(--type-label)', color: 'var(--text-primary)' }}>{label}</label>
      )}
      <div style={{ position: 'relative' }}>
        <button
          id={selId}
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-invalid={hasError || undefined}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={onKeyDown}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 'var(--space-2)', textAlign: 'left',
            borderRadius: 'var(--radius-sm)',
            font: 'var(--type-body)', lineHeight: 1.2,
            color: disabled ? 'var(--text-tertiary)' : (selected ? 'var(--text-primary)' : 'var(--text-tertiary)'),
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
            boxSizing: 'border-box',
            ...chrome,
          }}
          {...rest}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {renderTrigger ? renderTrigger(selected) : (selected ? selected.label : placeholder)}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--dur-base) var(--ease-out)' }}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {open && (
          <div
            style={{
              position: 'absolute', left: 0, right: 0, zIndex: 20,
              [flip ? 'bottom' : 'top']: '100%',
              [flip ? 'marginBottom' : 'marginTop']: 6,
              background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)', boxSizing: 'border-box',
              overflow: 'hidden',
              animation: 'dovaSelectIn var(--dur-base) var(--ease-out)',
              transformOrigin: flip ? 'bottom center' : 'top center',
            }}
          >
            {searchable && (
              <div style={{ padding: 6, borderBottom: '1px solid var(--border)' }}>
                <input
                  ref={searchRef}
                  value={query}
                  placeholder={searchPlaceholder}
                  onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
                  onKeyDown={onKeyDown}
                  style={{
                    width: '100%', border: 'none', outline: 'none', background: 'transparent',
                    padding: '8px 10px', font: 'var(--type-body-sm)', color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
            <ul role="listbox" style={{ listStyle: 'none', margin: 0, padding: 6, maxHeight: 280, overflowY: 'auto' }}>
              {visible.length === 0 && (
                <li style={{ padding: '11px 14px', font: 'var(--type-body-sm)', color: 'var(--text-tertiary)' }}>No matches</li>
              )}
              {visible.map((o, i) => {
                const isSel = o.value === current;
                const isActive = i === activeIdx;
                const header = o.group && o.group !== lastGroup ? o.group : null;
                lastGroup = o.group || lastGroup;
                return (
                  <React.Fragment key={o.value}>
                    {header && (
                      <li aria-hidden style={{
                        padding: '10px 14px 4px', font: 'var(--type-eyebrow)',
                        letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase',
                        color: 'var(--text-tertiary)',
                      }}>{header}</li>
                    )}
                    <li
                      role="option"
                      aria-selected={isSel}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => commit(o)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)',
                        padding: '11px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        font: 'var(--type-body)',
                        fontWeight: isSel ? 600 : 400,
                        color: isSel ? 'var(--cta)' : 'var(--text-primary)',
                        background: isSel ? 'var(--interactive-soft)' : (isActive ? 'var(--muted)' : 'transparent'),
                        transition: 'background var(--dur-fast) var(--ease-out)',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                      {isSel && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--cta)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </li>
                  </React.Fragment>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {(helper || error) && (
        <span style={{ font: 'var(--type-caption)', color: hasError ? 'var(--danger)' : 'var(--text-tertiary)' }}>
          {error || helper}
        </span>
      )}
    </div>
  );
}


/**
 * Dova radio rows — single-choice control where each option is a full-width
 * bordered row. Selected rows take the --interactive border AND the
 * --interactive-soft fill, so the row itself is the answer.
 *
 * Synced to packages/dova-ds/src/RadioCards.tsx + RadioCard.tsx (Phase 2).
 *
 * THE DOT IS TRAILING. It reads as the row's answer rather than its bullet, it
 * keeps the label flush left with the avatar when one is present, and it lands
 * where the eye finishes rather than where it starts.
 *
 * The BORDER token is --interactive and not --success: --success is a STATUS (a
 * thing that went well); a control's boundary is not. The DOT keeps --success,
 * which became usable for it once --success was repainted to #2C4C48 — before
 * that the two carried the same hex and the distinction was invisible.
 *
 * `avatar` is a rounded SQUARE, not a disc: what sits in it is usually a product
 * logo, and every one of those is drawn on a square grid — a circle crops a mark
 * that was never meant to be cropped. --radius-md inside the row's --radius-lg,
 * the smaller inner radius that nested corners want. The tile is --canvas in
 * BOTH states, so the logo does not flicker as you move down the list; the fill
 * says "selected" once, on the row, instead of twice.
 */
function RadioRows({
  name,
  options = [],
  value,
  onChange = null,
  disabled = false,
  style = {},
  ...rest
}) {
  const reactId = React.useId();
  const groupName = name || reactId;

  return (
    <div
      role="radiogroup"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxWidth: '100%', ...style }}
      {...rest}
    >
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const checked = opt.value === value;
        const isDisabled = disabled || opt.disabled;
        return (
          <RadioRow
            key={opt.value}
            name={groupName}
            option={opt}
            checked={checked}
            disabled={isDisabled}
            onChange={onChange}
          />
        );
      })}
    </div>
  );
}

function RadioRow({ name, option, checked, disabled, onChange }) {
  const [hover, setHover] = React.useState(false);
  const lit = checked || (!disabled && hover);

  return (
    <label className="dova-radio-row"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${lit ? 'var(--interactive)' : 'var(--field-bd, var(--border))'}`,
        background: checked ? 'var(--interactive-soft)' : 'var(--field-bg, var(--surface))',
        backdropFilter: 'var(--field-blur, none)', WebkitBackdropFilter: 'var(--field-blur, none)',
        padding: 'var(--space-16)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color var(--dur-base) var(--ease-out), background-color var(--dur-base) var(--ease-out)',
        boxSizing: 'border-box',
      }}
    >
      <input
        type="radio"
        name={name}
        value={option.value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange && onChange(option.value)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      {option.avatar && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 48, height: 48, flexShrink: 0,
          borderRadius: option.avatarShape === 'circle' ? 'var(--radius-pill)' : 'var(--radius-md)',
          background: 'var(--canvas)', overflow: 'hidden',
        }}>{option.avatar}</span>
      )}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        {(option.title || option.label) && (
          <span style={{ font: 'var(--type-body)', lineHeight: 1.4, fontWeight: 400, color: 'var(--text-primary)' }}>
            {option.title || option.label}
          </span>
        )}
        {option.description && (
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{option.description}</span>
        )}
      </span>
      {option.meta && <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>{option.meta}</span>}
      {/* Trailing dot — the row's answer, not its bullet. */}
      <span aria-hidden style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, flexShrink: 0, order: -1,
        borderRadius: 'var(--radius-pill)',
        border: `1.5px solid ${checked ? 'var(--interactive)' : 'var(--field-bd, var(--border))'}`,
        background: 'var(--surface)',
        transition: 'border-color var(--dur-base) var(--ease-out)',
      }}>
        {checked && <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--interactive)' }} />}
      </span>
    </label>
  );
}


/**
 * Dova checkbox — 20px box, radius 5, 1.5px border, --interactive fill when
 * checked or indeterminate. Pairs a label and optional description; the whole
 * row is clickable.
 *
 * Synced to packages/dova-ds/src/Checkbox.tsx (Phase 2).
 *
 * 20px rather than 16 on the operator's eye: at 16 the box read as small beside
 * 14px text. The hit target did not change and never needed to — the whole
 * label row is the control, already past WCAG 2.5.8's 24px floor. Square, not
 * 20x24: a rectangular checkbox reads as a field or a button, and the glyph has
 * no honest centre in one.
 *
 * --interactive, NOT --success, marks the committed state across the selection
 * controls (radio, checkbox, switch). --cta is the colour of the ONE action a
 * screen is pushing you toward; a checked box is not that — it is a thing you
 * have already settled, and it should not compete with the primary button next
 * to it. This also lines the controls up with the fields, which hover and focus
 * on the same green, so "you did this" reads the same everywhere.
 */
function Checkbox({
  checked = false,
  indeterminate = false,
  onChange = null,
  label,
  description = null,
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const reactId = React.useId();
  const boxId = id || reactId;
  const filled = checked || indeterminate;

  const box = {
    display: 'flex', height: 20, width: 20, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 5, borderWidth: 1.5, borderStyle: 'solid',
    transition: 'background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
    marginTop: description ? 1 : 0,
  };
  const skin = disabled
    ? { borderColor: 'var(--border)', background: 'var(--muted)' }
    : filled
      ? { borderColor: 'var(--interactive)', background: 'var(--interactive)', color: '#FFFFFF' }
      : { borderColor: 'var(--field-bd, var(--border))', background: 'var(--surface)' };

  return (
    <button
      id={boxId}
      type="button"
      role="checkbox"
      className="dova-check"
      aria-checked={indeterminate ? 'mixed' : checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        display: 'inline-flex', gap: 12, textAlign: 'left',
        alignItems: description ? 'flex-start' : 'center',
        background: 'none', border: 'none', padding: 0,
        userSelect: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden style={{ ...box, ...skin }}>
        {indeterminate ? (
          <span style={{ height: 1.5, width: 10, borderRadius: 1, background: '#FFFFFF' }} />
        ) : checked ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        ) : null}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {label && <span style={{ font: 'var(--type-body)', lineHeight: 1.4 }}>{label}</span>}
        {description && (
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{description}</span>
        )}
      </span>
    </button>
  );
}


/**
 * Dova eyebrow — the small UPPERCASE, wide-tracked label that sits above a
 * heading. Inter 600/12 on +0.1em tracking, in the quiet --text-tertiary ink.
 * Often numbered ("01 · FOUNDATIONS", "RECURRING THEMES") — pass the number
 * as children. Tokens only; renders a <span> by default.
 *
 * Synced to packages/dova-ds/src/Eyebrow.tsx (Phase 2). Was 13px on the
 * --eyebrow alias and --type-micro-line; the code moved it to 12px and the
 * --type-eyebrow shorthand.
 */
function Eyebrow({ children, as = 'span', color, style = {}, ...rest }) {
  const Tag = as;
  return (
    <Tag
      style={{
        font: 'var(--type-eyebrow)',
        letterSpacing: 'var(--tracking-eyebrow)',
        textTransform: 'uppercase',
        /* `color` overrides the default quiet grey, e.g. var(--warning). */
        color: color || 'var(--text-tertiary)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}


export { Input, Select, RadioRows, Checkbox, Eyebrow };
