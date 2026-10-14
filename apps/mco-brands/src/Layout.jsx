import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Navbar, Footer } from '@pyfon/ui';
import { api, STORE } from './api.js';

export default function Layout() {
  const [cats, setCats] = useState([]);
  const [term, setTerm] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    api.catalog.categories(STORE).then((d) => setCats(d.categories)).catch(() => {});
  }, []);

  function search(e) {
    e.preventDefault();
    nav('/shop?q=' + encodeURIComponent(term.trim()));
  }

  const right = (
    <form className="search" onSubmit={search}>
      <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search products" aria-label="Search" />
      <select aria-label="Currency" defaultValue="KES"><option value="KES">KES</option></select>
    </form>
  );

  return (
    <>
      <div className="announce">Custom branding with your name, logo or photo. Order online, confirm on WhatsApp.</div>
      <Navbar brand="M & Co. Brands" links={[{ label: 'Shop all', href: '/shop' }, { label: 'Print and design services', href: '/shop?type=service' }]} right={right} />
      <div className="catbar">
        <div className="wrap">
          {cats.map((c) => (
            <Link key={c.slug} to={'/shop?category=' + c.slug}>{c.name}</Link>
          ))}
        </div>
      </div>
      <main style={{ minHeight: '60vh' }}><Outlet /></main>
      <Footer />
    </>
  );
}
