import { useState } from 'react';
import { GUIDES } from './guidesContent.js';

const PRINT_CSS = '@media print { body * { visibility: hidden !important; } .gdprint, .gdprint * { visibility: visible !important; } .gdprint { position: absolute; left: 0; top: 0; width: 100%; } .gdno { display: none !important; } .gdbreak { page-break-after: always; } }';

function Guide({ g }) {
  return (
    <div className="gdbreak" style={{ marginBottom: '24px' }}>
      <h2>{g.title}</h2>
      <p>{g.intro}</p>
      <ol>{g.steps.map((s, i) => <li key={i} style={{ marginBottom: '6px' }}>{s}</li>)}</ol>
    </div>
  );
}

export default function DevGuides() {
  const [id, setId] = useState(GUIDES[0].id);
  const [all, setAll] = useState(false);
  const g = GUIDES.find((x) => x.id === id) || GUIDES[0];
  function printOne() { setAll(false); setTimeout(() => window.print(), 200); }
  function printAll() { setAll(true); setTimeout(() => { window.print(); setAll(false); }, 400); }
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <style>{PRINT_CSS}</style>
      <div className="gdno">
        <h1 className="center">Guides</h1>
        <p className="center muted">Plain guides for the partners. Print one, or all of them. To share, print and choose Save as PDF, then send the file.</p>
        <div className="actbar" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          {GUIDES.map((x) => <button key={x.id} type="button" className={x.id === id ? 'btn' : 'line'} onClick={() => setId(x.id)}>{x.title}</button>)}
        </div>
        <div className="actbar" style={{ justifyContent: 'center' }}>
          <button type="button" className="line" onClick={printOne}>Print this guide</button>
          <button type="button" className="line" onClick={printAll}>Print all guides</button>
        </div>
      </div>
      <section className="card gdprint">
        <p style={{ fontWeight: 'bold', margin: 0 }}>Pyfon Brands &middot; Partner guide</p>
        {all ? GUIDES.map((x) => <Guide key={x.id} g={x} />) : <Guide g={g} />}
        <p className="muted" style={{ marginBottom: 0 }}>Operated by Pyfon Brands<br />Built and owned by Emlabs &middot; &copy; Emlabs. All rights reserved.</p>
      </section>
    </div>
  );
}
