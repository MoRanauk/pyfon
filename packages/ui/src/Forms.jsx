export function Button({ children, variant = 'primary', ...rest }) {
  const primary = variant === 'primary';
  return (
    <button
      type="button"
      {...rest}
      style={{ padding: '10px 18px', border: primary ? 0 : '1px solid var(--pf-navy)', borderRadius: 'var(--pf-radius)', background: primary ? 'var(--pf-accent)' : 'transparent', color: primary ? 'var(--pf-onAccent)' : 'var(--pf-navy)', fontWeight: 600, cursor: 'pointer', ...(rest.style || {}) }}
    >
      {children}
    </button>
  );
}

export function TextField({ label, error, id, ...rest }) {
  const fieldId = id || 'f-' + String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div style={{ marginBottom: '14px' }}>
      <label htmlFor={fieldId} style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--pf-muted)' }}>{label}</label>
      <input id={fieldId} {...rest} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid var(--pf-border)', borderRadius: 'var(--pf-radius)', background: 'var(--pf-surface)', color: 'var(--pf-text)', fontSize: '16px' }} />
      {error ? <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#B42318' }}>{error}</p> : null}
    </div>
  );
}
