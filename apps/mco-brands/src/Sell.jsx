import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TextField } from '@pyfon/ui';
import { api } from './api.js';
import { useAuth } from './AuthState.jsx';
import { errText } from './util.js';

const PHONE = /^\+?[0-9 ]{9,15}$/;

export default function Sell() {
  const { user } = useAuth();
  const [f, setF] = useState({ name: '', phone: '', role: 'Dealer or maker', link: '', about: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (f.name.trim().length < 2) return setErr('Enter your name or business name.');
    if (!PHONE.test(f.phone.trim())) return setErr('Enter a valid phone number, 9 to 15 digits.');
    if (f.about.trim().length < 10) return setErr('Tell us a little about what you do.');
    const body = [
      'Name: ' + f.name.trim(),
      'Phone: ' + f.phone.trim(),
      'I am a: ' + f.role,
      'Portfolio or social link: ' + (f.link.trim() || 'none'),
      '',
      f.about.trim()
    ].join('\n');
    setBusy(true);
    try {
      const d = await api.tickets.create('customer', { subject: 'Seller application: ' + f.name.trim(), body });
      setDone({ ref: d.ticket && d.ticket.ref });
    } catch (ex) {
      setErr(errText(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap section">
      <section className="sellhero">
        <h1>Grow with Pyfon Brands</h1>
        <p>Dealers, makers and designers: we bring you customers and jobs. Tell us what you do and we will be in touch.</p>
        <a className="btn" href="#apply">Apply now</a>
      </section>

      <div className="paths">
        <div className="card2">
          <h3>Dealers and makers</h3>
          <p>Do you print, embroider, sew or produce something specialist? We outsource apparel, paperwork and other specialist work through our partner workflow.</p>
        </div>
        <div className="card2">
          <h3>Designers</h3>
          <p>Share your artwork and graphic skills. We are opening designer collections in stages. Apply now and we invite designers to the first one.</p>
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--pf-font-heading)' }}>How it works</h2>
      <div className="steps">
        <div className="card2"><b>1</b><p>Apply with a few details and a link to your work.</p></div>
        <div className="card2"><b>2</b><p>Our partners review your application.</p></div>
        <div className="card2"><b>3</b><p>We agree terms and payment with you.</p></div>
        <div className="card2"><b>4</b><p>You start receiving jobs or sales.</p></div>
      </div>

      <div id="apply" className="auth" style={{ paddingTop: 40 }}>
        <h2 style={{ fontFamily: 'var(--pf-font-heading)', marginTop: 0 }}>Apply to sell with us</h2>
        {done ? (
          <div className="banner">
            <p><strong>Thank you!</strong> Your application is in{done.ref ? ' (reference ' + done.ref + ')' : ''}. A partner will contact you on WhatsApp.</p>
          </div>
        ) : !user ? (
          <div className="banner">
            <p>Please sign in first so we can follow up with you.</p>
            <Link className="btn" to="/account?next=/sell">Sign in or sign up</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <TextField label="Your name or business name" value={f.name} onChange={set('name')} />
            <TextField label="Phone (WhatsApp)" value={f.phone} onChange={set('phone')} />
            <label className="fld">I am a
              <select value={f.role} onChange={set('role')}>
                <option>Dealer or maker</option>
                <option>Designer</option>
                <option>Both</option>
              </select>
            </label>
            <TextField label="Link to your work (optional)" value={f.link} onChange={set('link')} />
            <label className="fld">What do you do?
              <textarea rows={4} value={f.about} onChange={set('about')} maxLength={1500} />
            </label>
            {err ? <p role="alert" style={{ color: '#b00020', margin: 0 }}>{err}</p> : null}
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send application'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
