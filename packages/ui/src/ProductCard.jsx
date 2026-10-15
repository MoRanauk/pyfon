export function formatKES(n) {
  return 'KES ' + Number(n).toLocaleString('en-KE');
}

// priceType: fixed | from | quote
export function ProductCard({ name, imageUrl, priceType, priceKes, compareAtKes, href, onAction, actionLabel }) {
  let price = 'Request a quote';
  if (priceType === 'fixed' && priceKes != null) price = formatKES(priceKes);
  if (priceType === 'from' && priceKes != null) price = 'From ' + formatKES(priceKes);
  const showOld = compareAtKes != null && priceType !== 'quote';
  return (
    <article style={{ border: '1px solid var(--pf-border)', borderRadius: 'var(--pf-radius)', background: 'var(--pf-surface)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <a href={href || '#'} style={{ color: 'inherit', textDecoration: 'none' }}>
        {imageUrl ? <img src={imageUrl} alt={name} loading="lazy" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} /> : null}
        <div style={{ padding: '10px 12px' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontFamily: 'var(--pf-font-body, system-ui, sans-serif)', fontWeight: 500 }}>{name}</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            <strong>{price}</strong>
            {showOld ? <span style={{ marginLeft: '8px', color: 'var(--pf-muted)', textDecoration: 'line-through' }}>{formatKES(compareAtKes)}</span> : null}
          </p>
        </div>
      </a>
      {onAction ? (
        <button type="button" onClick={onAction} style={{ margin: '0 12px 12px', padding: '10px', border: 0, borderRadius: 'var(--pf-radius)', background: 'var(--pf-accent)', color: 'var(--pf-onAccent)', fontWeight: 600, cursor: 'pointer' }}>
          {actionLabel || 'Add to cart'}
        </button>
      ) : null}
    </article>
  );
}

