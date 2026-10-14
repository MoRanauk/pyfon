// links: [{ label, href }]. right: anything (cart button, login link, stage badge).
export function Navbar({ brand, links = [], right = null }) {
  return (
    <header style={{ background: 'var(--pf-navy)', color: '#fff' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '12px 16px', flexWrap: 'wrap' }}>
        <a href="/" style={{ color: 'var(--pf-gold)', fontFamily: 'var(--pf-font-heading)', fontSize: '20px', fontWeight: 700, textDecoration: 'none' }}>{brand}</a>
        <div style={{ display: 'flex', gap: '16px', flex: 1, flexWrap: 'wrap' }}>
          {links.map((l) => (
            <a key={l.href + l.label} href={l.href} style={{ color: '#fff', textDecoration: 'none', fontSize: '14px' }}>{l.label}</a>
          ))}
        </div>
        <div>{right}</div>
      </nav>
    </header>
  );
}
