import { useRef } from 'react';
import { ProductCard, Reveal } from '@pyfon/ui';
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
        <Reveal>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <h2>{title}</h2>
            {action}
          </div>
          {children}
        </Reveal>
      </div>
    </section>
  );
}

// A row that scrolls sideways, with a next arrow.
export function Rail({ children }) {
  const ref = useRef(null);
  return (
    <div className="railwrap">
      <div className="rail" ref={ref}>{children}</div>
      <button
        type="button"
        className="railbtn"
        aria-label="Scroll right"
        onClick={() => { if (ref.current) ref.current.scrollBy({ left: 620, behavior: 'smooth' }); }}
      >{'\u203a'}</button>
    </div>
  );
}
