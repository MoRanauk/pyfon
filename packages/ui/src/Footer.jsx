// The two shared footer lines. Used by all seven interfaces.
export const FOOTER_LINES = [
  'Operated by Pyfon Brands',
  'Built and owned by Emlabs \u00b7 \u00a9 Emlabs. All rights reserved.'
];

export function Footer() {
  return (
    <footer style={{ padding: '20px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--pf-muted)', borderTop: '1px solid var(--pf-border)', background: 'var(--pf-surface)' }}>
      <p style={{ margin: '0 0 4px' }}>{FOOTER_LINES[0]}</p>
      <p style={{ margin: 0 }}>{FOOTER_LINES[1]}</p>
    </footer>
  );
}
