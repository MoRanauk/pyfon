const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const file = path.join(root, 'packages', 'ui', 'src', 'HelpButton.jsx');
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
src = src.replace(/\r\n/g, '\n');
if (src.includes('WA_URL')) { console.log('Already done'); process.exit(0); }

const A1 = `const POS = 'haruno_pos';`;
const B1 = `const POS = 'haruno_pos';
const WA_URL = 'https://wa.me/254794802462?text=' + encodeURIComponent('Hello Pyfon Brands, I would like to ask about an order.');`;

const A2 = `  if (above) { box.bottom = (B + 64) + 'px'; box.maxHeight = Math.max(160, vh - B - 80) + 'px'; }`;
const B2 = `  if (above) { box.bottom = (B + 132) + 'px'; box.maxHeight = Math.max(160, vh - B - 148) + 'px'; }`;

const A3 = `      <button type="button" data-haruno="1" style={fab}`;
const B3 = `      <a data-haruno="1" href={WA_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp" title="Chat with us on WhatsApp" style={{ ...fab, bottom: (B + 68) + 'px', background: '#25D366', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'auto', textDecoration: 'none' }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 20l1.3-4.1A8.5 8.5 0 1 1 8.2 18.8L4 20z" /><path d="M9.2 8.6c0 3.2 2.9 6 6.1 6.1l1.2-1.5-2-1-.9.8c-1-.4-1.9-1.3-2.3-2.3l.8-.9-1-2-1.9.8z" fill="#fff" stroke="none" /></svg>
      </a>
      <button type="button" data-haruno="1" style={fab}`;

for (const [a] of [[A1], [A2], [A3]]) {
  if (!src.includes(a)) { console.log('NOT FOUND: ' + a.slice(0, 50)); process.exit(1); }
}
src = src.replace(A1, () => B1).replace(A2, () => B2).replace(A3, () => B3);
if (crlf) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync(file, src);
console.log('Patched');
