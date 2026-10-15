import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { img } from './api.js';
import { displayName } from './AuthState.jsx';

// Slide-in menu. Works with a tree of any depth.
export default function SideMenu({ open, onClose, tree, user }) {
  const [path, setPath] = useState([]);
  const [dir, setDir] = useState('fwd');

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) return undefined;
    const t = setTimeout(() => setPath([]), 350);
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  const cur = path.length ? path[path.length - 1] : null;
  const list = cur ? cur.children || [] : tree;
  const go = (n) => { setDir('fwd'); setPath([...path, n]); };
  const back = () => { setDir('back'); setPath(path.slice(0, -1)); };
  const first = user ? displayName(user).split(' ')[0] : '';

  return (
    <>
      <div className={'scrim' + (open ? ' on' : '')} onClick={onClose} />
      <aside className={'drawer' + (open ? ' on' : '')} aria-hidden={!open} aria-label="Menu">
        {cur ? (
          <div className="dsub">
            <button type="button" className="dback" onClick={back} aria-label="Back">{'\u2039'}</button>
            <span>{cur.title}</span>
          </div>
        ) : (
          <div className="dhead">
            {user ? (
              <>Hi {first}! <Link to="/account" onClick={onClose}>My account</Link></>
            ) : (
              <>Hi there!<br /><Link to="/account" onClick={onClose}>Log in</Link> or <Link to="/account?mode=up" onClick={onClose}>Sign up</Link></>
            )}
          </div>
        )}
        <div className={'dpanel ' + dir} key={path.map((p) => p.key).join('/') || 'root'}>
          <ul>
            {cur ? <li><Link className="drow" to={cur.to} onClick={onClose}><span>All {cur.title}</span></Link></li> : null}
            {list.map((n) => (
              <li key={n.key}>
                {n.children && n.children.length ? (
                  <button type="button" className="drow" onClick={() => go(n)}>
                    {n.image ? <img src={img(n.image)} alt="" /> : null}
                    <span>{n.title}</span>
                    <b aria-hidden="true">{'\u203a'}</b>
                  </button>
                ) : (
                  <Link className="drow" to={n.to} onClick={onClose}>
                    {n.image ? <img src={img(n.image)} alt="" /> : null}
                    <span>{n.title}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
          {!cur ? (
            <div className="dlinks">
              <Link to="/sell" onClick={onClose}>Sell with us</Link>
              <Link to="/quote" onClick={onClose}>Get a quote</Link>
              <Link to="/info/delivery" onClick={onClose}>Delivery</Link>
              <Link to="/info/contact" onClick={onClose}>Contact us</Link>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
