import { Link, useParams } from 'react-router-dom';
import { SOCIAL } from './social.js';

const PAGES = {
  about: {
    title: 'About Pyfon Brands',
    body: [
      'Pyfon Brands does graphic design and every kind of printing: paperwork, indoor and outdoor advertising, posters, laser printing, UV printing, heat press printing and embroidery.',
      'We also customise and brand merchandise. Give us a design, a name, a quote, a logo or a photo and we do the work.',
      'Every job is checked by our three partners before it leaves us. This website is built and owned by Emlabs.'
    ]
  },
  how: {
    title: 'How it works',
    body: [
      '1. Choose a product and add it to your cart, or send us a quote request for printing and design work.',
      '2. We confirm the price, the date and any details with you on WhatsApp.',
      '3. Our partners check your job at every stage.',
      '4. We tell you when it is ready, and we deliver or you collect.'
    ]
  },
  delivery: {
    title: 'Delivery',
    body: [
      'Delivery costs are paid by the customer.',
      'After you order, we confirm the delivery cost and the date with you on WhatsApp before dispatch.',
      'Ready dates depend on the product and are shown on each product page.'
    ]
  },
  contact: {
    title: 'Contact us',
    body: [
      'The fastest way to reach us is WhatsApp. Tell us about your order, your design or your idea.'
    ],
    whatsapp: true
  }
};

export default function Info() {
  const { slug } = useParams();
  const p = PAGES[slug];
  if (!p) {
    return (
      <div className="wrap section">
        <h2>Page not found</h2>
        <Link to="/">Back to home</Link>
      </div>
    );
  }
  return (
    <div className="wrap section" style={{ maxWidth: 760 }}>
      <h1 style={{ fontFamily: 'var(--pf-font-heading)' }}>{p.title}</h1>
      {p.body.map((t, i) => <p key={i} style={{ lineHeight: 1.7 }}>{t}</p>)}
      {p.whatsapp ? <a className="btn" href={SOCIAL.whatsapp} target="_blank" rel="noreferrer">Message us on WhatsApp</a> : null}
    </div>
  );
}
