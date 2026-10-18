import { useState } from 'react';

// Password box with an eye button that shows or hides what was typed. Used by every interface.
export function PasswordField({ label, error, id, ...rest }) {
  const [show, setShow] = useState(false);
  const fieldId = id || 'f-' + String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const icon = show ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  return (
    <div style={{ marginBottom: '14px' }}>
      <label htmlFor={fieldId} style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: 'var(--pf-muted)' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input id={fieldId} {...rest} type={show ? 'text' : 'password'} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 46px 10px 10px', border: '1px solid var(--pf-border)', borderRadius: 'var(--pf-radius)', background: 'var(--pf-surface)', color: 'var(--pf-text)', fontSize: '16px' }} />
        <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', border: 0, background: 'transparent', cursor: 'pointer', padding: '6px', color: 'var(--pf-muted)', lineHeight: 0 }}>{icon}</button>
      </div>
      {error ? <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#B42318' }}>{error}</p> : null}
    </div>
  );
}
