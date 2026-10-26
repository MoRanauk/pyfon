const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const errors = [];
const file = 'apps/m3labs/src/ProductEdit.jsx';
const p = path.join(root, file);
if (!fs.existsSync(p)) errors.push('MISSING FILE ' + file);

const COMP = `function OptionPhotos({ sku, options, act, busy }) {
  const groups = Array.isArray(options) ? options.filter((g) => g && typeof g.name === 'string' && Array.isArray(g.values)) : [];
  const choices = groups.flatMap((g) => g.values.map((v) => ({ name: g.name, value: v })));
  const [list, setList] = useState([]);
  const [sel, setSel] = useState('');
  const [link, setLink] = useState('');
  const base = C + '/items/' + sku + '/option-images';
  const reload = useCallback(() => get(base).then((r) => setList(r.optionImages || [])).catch(() => {}), [base]);
  useEffect(() => { reload(); }, [reload]);
  const keyOf = (c) => c.name + ': ' + c.value;
  const cur = choices.find((c) => keyOf(c) === sel) || null;
  const mine = cur ? list.filter((x) => x.optionName === cur.name && x.optionValue === cur.value) : [];
  const known = new Set(choices.map(keyOf));
  const orphans = list.filter((x) => !known.has(x.optionName + ': ' + x.optionValue));
  const countOf = (c) => list.filter((x) => x.optionName === c.name && x.optionValue === c.value).length;

  function addFile(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    act(async () => {
      if (!cur) throw new Error('Choose the colour or size first.');
      if (f.size > MAX_IMG) throw new Error('That photo is over 5 MB. Make it smaller first.');
      const fd = new FormData();
      fd.append('optionName', cur.name);
      fd.append('optionValue', cur.value);
      fd.append('file', f);
      await post(base, fd);
      await reload();
    }, 'Photo added.');
  }
  function addLink() {
    act(async () => {
      if (!cur) throw new Error('Choose the colour or size first.');
      if (!/^https:\\/\\//.test(link.trim())) throw new Error('The link must start with https://');
      await post(base, { url: link.trim(), optionName: cur.name, optionValue: cur.value });
      setLink('');
      await reload();
    }, 'Photo added.');
  }
  function remove(x) {
    act(async () => {
      await post(base + '/remove', { optionName: x.optionName, optionValue: x.optionValue, position: x.position });
      await reload();
    }, 'Photo removed from this choice.');
  }
  const row = (x) => (
    <div className="mrow" key={x.optionName + x.optionValue + x.position}>
      <img className="thumb" src={mediaUrl(x.url)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
      <span className="grow">{x.optionName + ': ' + x.optionValue}</span>
      <button type="button" className="danger sm" disabled={busy} onClick={() => remove(x)}>Remove</button>
    </div>
  );

  return (
    <div className="card">
      <h2>Photos for a colour or size</h2>
      <p className="muted">When a customer picks a colour or size in the shop, the photos set here are shown for that choice (on M &amp; Co. they come first). Choices with no photo here keep the main photos. Max 5 MB each, up to 8 per choice.</p>
      {!choices.length ? (
        <p className="muted">This product has no colour or size options yet. Add them in the Options box above (like Colour: Red|Blue), save, then come back here.</p>
      ) : (
        <>
          <F label="Which colour or size?">
            <select value={sel} onChange={(e) => setSel(e.target.value)}>
              <option value="">Choose...</option>
              {choices.map((c) => <option key={keyOf(c)} value={keyOf(c)}>{keyOf(c) + ' (' + countOf(c) + ' photos)'}</option>)}
            </select>
          </F>
          {cur ? (
            <>
              {!mine.length ? <p className="muted">No photos for this choice yet.</p> : null}
              {mine.map(row)}
              <div className="mrow">
                <label className="filebtn">Choose a photo<input type="file" hidden accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={addFile} /></label>
                <span className="muted">or paste a link:</span>
              </div>
              <div className="mrow">
                <input style={{ flex: 1, minWidth: '180px' }} placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
                <button type="button" disabled={busy || !link.trim()} onClick={addLink}>Add by link</button>
              </div>
            </>
          ) : null}
        </>
      )}
      {orphans.length ? (
        <>
          <h3>Photos for choices that no longer exist</h3>
          <p className="muted">These belong to an option that was renamed or removed, so the shop never shows them.</p>
          {orphans.map(row)}
        </>
      ) : null}
    </div>
  );
}

function Designs({ sku, designs, act, busy }) {`;

const pairs = [
  [`function Designs({ sku, designs, act, busy }) {`, COMP],
  [`<Designs sku={sku} designs={d.designs} act={act} busy={busy} />`, `<OptionPhotos sku={sku} options={d.item.options} act={act} busy={busy} />\n      <Designs sku={sku} designs={d.designs} act={act} busy={busy} />`],
];
let out = '';
let changed = 0;
if (!errors.length) {
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let t = raw.replace(/\r\n/g, '\n');
  for (const [o, n] of pairs) {
    if (t.includes(n)) continue;
    const c = t.split(o).length - 1;
    if (c !== 1) { errors.push('NOT FOUND (' + c + ') in ' + file + ': ' + o.slice(0, 70)); continue; }
    t = t.split(o).join(n);
    changed++;
  }
  out = crlf ? t.replace(/\n/g, '\r\n') : t;
}
if (errors.length) { errors.forEach((e) => console.log(e)); console.log('FAIL: nothing written'); process.exit(1); }
fs.writeFileSync(p, out, 'utf8');
console.log('Patched ' + file + (changed ? ' (' + changed + ' edits)' : ' (already done)'));
console.log('PASS: option photos screen patched');
