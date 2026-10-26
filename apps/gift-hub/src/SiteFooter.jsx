import { Link } from 'react-router-dom';
import { Footer } from '@pyfon/ui';
import { SOCIAL } from './social.js';

const NETWORKS = [['Instagram', 'instagram'], ['Facebook', 'facebook'], ['TikTok', 'tiktok'], ['X', 'x'], ['YouTube', 'youtube'], ['WhatsApp', 'whatsapp']];

export default function SiteFooter({ groups }) {
  const socials = NETWORKS.filter(([, k]) => SOCIAL[k]);
  return (
    <>
      <footer className="sitefoot">
        <div className="wrap fgrid">
          <div>
            <h4>Shop</h4>
            {groups.map((g) => <Link key={g.key} to={'/c/' + g.key}>{g.title}</Link>)}
            <Link to="/quote?kind=bulk">Bulk orders</Link>
          </div>
          <div>
            <h4>About</h4>
            <Link to="/info/about">About us</Link>
            <Link to="/info/how">How it works</Link>
            <Link to="/sell">Sell with us</Link>
            <Link to="/co-brand">Co. Brand</Link>
          </div>
          <div>
            <h4>Help</h4>
            <Link to="/info/delivery">Delivery</Link>
            <Link to="/info/contact">Contact us</Link>
            <Link to="/account">My account</Link>
            <Link to="/cart">My cart</Link>
          </div>
          <div>
            <h4>Follow us</h4>
            {socials.map(([label, k]) => <a key={k} href={SOCIAL[k]} target="_blank" rel="noreferrer">{label}</a>)}
          </div>
        </div>
      </footer>
      <Footer />
    </>
  );
}
