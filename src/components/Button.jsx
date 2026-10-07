/**
 * Dova Button — ported from the design system (components/DovaButton.jsx).
 * Sizes are a HEIGHT (24 / 32 / 40 / 48); xl also moves the label to 18px.
 * Hover styles live in styles/global.css.
 */
const SIZES = {
  sm: { height: 24, padding: '0 16px', font: 12 },
  md: { height: 32, padding: '0 24px', font: 14 },
  lg: { height: 40, padding: '0 24px', font: 16 },
  xl: { height: 48, padding: '0 32px', font: 18 },
};

const VARIANTS = {
  primary: { background: 'var(--cta)', color: 'var(--on-cta)', boxShadow: 'var(--shadow-button)' },
  outline: { background: 'transparent', color: 'var(--text-primary)', borderColor: 'var(--border)' },
  inverse: { background: 'var(--surface)', color: 'var(--cta-ink)', boxShadow: 'var(--shadow-button)' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)' },
};

const DISABLED_FILL = { background: 'var(--disabled-fill)', color: '#FFFFFF', border: 'none', boxShadow: 'none' };
const DISABLED = {
  primary: DISABLED_FILL,
  inverse: DISABLED_FILL,
  outline: { background: 'transparent', color: 'var(--text-tertiary)', borderColor: 'var(--border)', boxShadow: 'none' },
  ghost: { background: 'transparent', color: 'var(--text-tertiary)', boxShadow: 'none' },
};

export function Button({ children, variant = 'primary', size = 'md', type = 'button', disabled = false, full = false, style = {}, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
    height: s.height, padding: s.padding, width: full ? '100%' : undefined,
    fontFamily: 'var(--font-sans)', fontSize: s.font, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.005em',
    /* Button labels are Title Case system-wide. */
    textTransform: 'capitalize', textDecoration: 'none',
    borderRadius: 'var(--radius-sm)', border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
    whiteSpace: 'nowrap', boxSizing: 'border-box',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      className="dova-btn"
      data-variant={variant}
      style={{ ...base, ...VARIANTS[variant], ...(disabled ? DISABLED[variant] : {}), ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
