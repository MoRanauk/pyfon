import { useState } from 'react';

export const COUNTRIES = [
  ['Kenya', '254'], ['Uganda', '256'], ['Tanzania', '255'], ['Rwanda', '250'], ['Burundi', '257'],
  ['South Sudan', '211'], ['Ethiopia', '251'], ['Somalia', '252'], ['Nigeria', '234'], ['Ghana', '233'],
  ['South Africa', '27'], ['Egypt', '20'], ['Zambia', '260'], ['Zimbabwe', '263'], ['Malawi', '265'],
  ['Mozambique', '258'], ['DR Congo', '243'], ['United Arab Emirates', '971'], ['Saudi Arabia', '966'],
  ['Qatar', '974'], ['United Kingdom', '44'], ['USA and Canada', '1'], ['Germany', '49'], ['France', '33'],
  ['Italy', '39'], ['Netherlands', '31'], ['Spain', '34'], ['India', '91'], ['China', '86'],
  ['Pakistan', '92'], ['Australia', '61'], ['Japan', '81'],
];

export const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());

export function phoneOk(full) {
  const s = String(full || '');
  const code = COUNTRIES.map((c) => c[1]).filter((c) => s.startsWith('+' + c)).sort((a, b) => b.length - a.length)[0];
  if (!code) return false;
  const n = s.slice(1 + code.length);
  return code === '254' ? /^[17]\d{8}$/.test(n) : /^\d{6,12}$/.test(n);
}

// Kenyan numbers go to the server as 07..., as before. Other countries as +code...
export function phoneForServer(full) {
  const s = String(full || '');
  return s.startsWith('+254') ? '0' + s.slice(4) : s;
}

export default function PhoneField({ label, onChange }) {
  const [code, setCode] = useState('254');
  const [num, setNum] = useState('');
  function push(c, n) {
    const d = n.replace(/\D/g, '').replace(/^0+/, '');
    onChange(d ? '+' + c + d : '');
  }
  return (
    <label className="fld">
      <span>{label || 'Phone'}</span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <select aria-label="Country code" value={code} style={{ maxWidth: '48%' }}
          onChange={(e) => { setCode(e.target.value); push(e.target.value, num); }}>
          {COUNTRIES.map(([n, c]) => <option key={n} value={c}>{n} (+{c})</option>)}
        </select>
        <input type="tel" inputMode="tel" autoComplete="tel-national" value={num} placeholder="712 345 678" style={{ flex: 1 }}
          onChange={(e) => { setNum(e.target.value); push(code, e.target.value); }} />
      </div>
      <small className="muted">Type the number without the country code.</small>
    </label>
  );
}
