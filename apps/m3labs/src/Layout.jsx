import { Link } from 'react-router-dom';
import { Footer } from '@pyfon/ui';
import { useAuth, nameOf } from './Auth.jsx';
import { STAGE, STAGE_LABEL } from './api.js';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const covering = user && user.stage && user.stage !== STAGE;
  return (
    <div className="shell">
      <header className="top">
        <Link to="/" className="brand">M3 Labs</Link>
        <span className="badge">{STAGE_LABEL[STAGE]}</span>
        <span className="grow" />
        <span className="who">{nameOf(user)}</span>
        <Link to="/password" className="who" style={{ color: '#fff' }}>Change password</Link>
        <button type="button" className="ghost" onClick={logout}>Sign out</button>
      </header>
      {covering ? <div className="cover">You are covering for the {STAGE_LABEL[STAGE]} partner. Every action is logged as acting for them.</div> : null}
      <main className="page">{children}</main>
      <Footer />
    </div>
  );
}
