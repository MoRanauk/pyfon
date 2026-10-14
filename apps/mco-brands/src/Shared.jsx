import { ProductCard } from '@pyfon/ui';
import { img } from './api.js';

export function Card({ it }) {
  return (
    <ProductCard
      name={it.name}
      imageUrl={img(it.image)}
      priceType={it.priceType}
      priceKes={it.priceKes}
      compareAtKes={it.compareAtPriceKes}
      href={'/p/' + it.sku}
    />
  );
}

export function Section({ title, children, action }) {
  return (
    <section className="section">
      <div className="wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2>{title}</h2>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}
