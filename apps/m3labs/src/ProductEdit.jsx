import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { P } from './api.js';
import { get, post, put, patch, mediaUrl } from './http.js';

const C = P + '/catalog';
const PERS = ['text', 'logo', 'photo'];
const MAX_IMG = 5 * 1024 * 1024;
const num = (v) => (String(v).trim() === '' ? null : Number(v));

function readOptions(o) {
  if (!o) return { text: '', locked: false };
  if (Array.isArray(o)) {
    const locked = o.some((g) => !g || typeof g.name !== 'string' || !Array.isArray(g.values) || g.values.some((v) => typeof v !== 'string'));
    if (locked) return { text: '', locked: true };
    return { text: o.map((g) => g.name + ': ' + g.values.join('|')).join('\n'), locked: false };
  }
  if (typeof o === 'object' && Object.keys(o).length === 0) return { text: '', locked: false };
  return { text: '', locked: true };
}

function parseOptions(t) {
  return t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf(':');
    const values = i > 0 ? l.slice(i + 1).split('|').map((v) => v.trim()).filter(Boolean) : [];
    if (i < 1 || !values.length) throw new Error('Each options line looks like  Colour: Red|Blue|Green');
    return { name: l.slice(0, i).trim(), values };
  });
}

function toForm(it) {
  const o = readOptions(it.options);
  return {
    name: it.name || '', type: it.type, category: it.category || '', subcategory: it.subcategory || '', description: it.description || '',
    features: (it.features || []).join('\n'), priceType: it.priceType, priceKes: it.priceKes ?? '', compareAt: it.compareAtPriceKes ?? '',
    minOrderQty: it.minOrderQty ?? 1, options: o.text, optionsLocked: o.locked,
    personalization: (it.personalization || []).filter((x) => PERS.includes(x)),
    stockStatus: it.stockStatus, stockQty: it.stockQty ?? '', leadTimeDays: it.leadTimeDays ?? '',
    tags: (it.tags || []).join(', '), featured: Boolean(it.featured), storefronts: it.storefronts || [], vendor: it.vendor || '',
  };
}

function toBody(f) {
  const quote = f.priceType === 'quote';
  const body = {
    name: f.name.trim(), type: f.type, category: f.category.trim(), subcategory: f.subcategory.trim() || null,
    description: f.description.trim(),
    features: f.features.split('\n').map((s) => s.trim()).filter(Boolean),
    priceType: f.priceType,
    priceKes: quote ? null : num(f.priceKes),
    compareAtPriceKes: quote ? null : num(f.compareAt),
    minOrderQty: num(f.minOrderQty) ?? 1,
    personalization: f.personalization,
    stockStatus: f.stockStatus, stockQty: num(f.stockQty), leadTimeDays: num(f.leadTimeDays),
    tags: f.tags.split(',').map((s) => s.trim()).filter(Boolean),
    featured: f.featured, storefronts: f.storefronts, vendor: f.vendor.trim() || null,
  };
  if (!f.optionsLocked) body.options = parseOptions(f.options);
  for (const k of ['priceKes', 'compareAtPriceKes', 'minOrderQty', 'stockQty', 'leadTimeDays']) {
    if (body[k] !== null && !Number.isInteger(body[k])) throw new Error('Prices, quantities and days must be whole numbers.');
  }
  return body;
}

function F({ label, children }) { return <label>{label}{children}</label>; }

function Photos({ sku, images, act, busy }) {
  const [link, setLink] = useState('');
  const [label, setLabel] = useState('');
  const base = C + '/items/' + sku + '/images';
  const cur = images.current;
  const arch = images.archive;

  function addFile(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    act(async () => {
      if (f.size > MAX_IMG) throw new Error('That photo is over 5 MB. Make it smaller first.');
      const fd = new FormData();
      fd.append('label', label.trim());
      fd.append('file', f);
      await post(base, fd);
      setLabel('');
    }, 'Photo added.');
  }
  function addLink() {
    act(async () => {
      if (!/^https:\/\//.test(link.trim())) throw new Error('The link must start with https://');
      await post(base, { url: link.trim(), label: label.trim() || undefined });
      setLink(''); setLabel('');
    }, 'Photo added.');
  }
  function move(i, dir) {
    const ids = cur.map((x) => x.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    act(() => put(base + '/order', { order: ids }), 'Order saved.');
  }
  function replace(id, e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    act(async () => {
      if (f.size > MAX_IMG) throw new Error('That photo is over 5 MB. Make it smaller first.');
      const fd = new FormData();
      fd.append('file', f);
      await post(base + '/' + id + '/replace', fd);
    }, 'Photo replaced. The old one is in the archive.');
  }
  function remove(id) {
    const reason = window.prompt('Why are you removing this photo? (optional, it goes to the archive)');
    if (reason === null) return;
    act(() => post(base + '/' + id + '/archive', { reason: reason.trim() || undefined }), 'Photo moved to the archive.');
  }

  return (
    <div className="card">
      <h2>Photos</h2>
      <p className="muted">The first photo is the main one. Removed photos go to the archive and can be restored. Max 5 MB each (PNG, JPG or WebP).</p>
      {!cur.length ? <p className="muted">No photos yet.</p> : null}
      {cur.map((im, i) => (
        <div className="mrow" key={im.id}>
          <img className="thumb" src={mediaUrl(im.url)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
          <span className="grow">{im.label || 'Photo ' + (i + 1)}{i === 0 ? ' (main)' : ''}</span>
          <button type="button" className="line sm" disabled={busy || i === 0} onClick={() => move(i, -1)}>Up</button>
          <button type="button" className="line sm" disabled={busy || i === cur.length - 1} onClick={() => move(i, 1)}>Down</button>
          <label className="filebtn sm">Replace<input type="file" hidden accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => replace(im.id, e)} /></label>
          <button type="button" className="danger sm" disabled={busy} onClick={() => remove(im.id)}>Remove</button>
        </div>
      ))}
      <h3>Add a photo</h3>
      <label>Label (optional)<input value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} /></label>
      <div className="mrow">
        <label className="filebtn">Choose a photo<input type="file" hidden accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={addFile} /></label>
        <span className="muted">or paste a link:</span>
      </div>
      <div className="mrow">
        <input style={{ flex: 1, minWidth: '180px' }} placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
        <button type="button" disabled={busy || !link.trim()} onClick={addLink}>Add by link</button>
      </div>
      {arch.length ? (
        <>
          <h3>Archive</h3>
          {arch.map((im) => (
            <div className="mrow" key={im.id}>
              <img className="thumb" src={mediaUrl(im.url)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              <span className="grow muted">{im.archiveReason || 'Removed'}{im.archivedBy ? ' by ' + im.archivedBy : ''}</span>
              <button type="button" className="line sm" disabled={busy} onClick={() => act(() => post(base + '/' + im.id + '/restore', {}), 'Photo restored.')}>Restore</button>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

function Designs({ sku, designs, act, busy }) {
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const base = C + '/items/' + sku + '/designs';
  const cur = designs.current;
  const arch = designs.archive;

  function addFile(e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    act(async () => {
      if (name.trim().length < 2) throw new Error('Type the design name first.');
      if (f.size > MAX_IMG) throw new Error('That image is over 5 MB. Make it smaller first.');
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('file', f);
      await post(base, fd);
      setName('');
    }, 'Design added.');
  }
  function addLink() {
    act(async () => {
      if (name.trim().length < 2) throw new Error('Type the design name first.');
      if (!/^https:\/\//.test(link.trim())) throw new Error('The link must start with https://');
      await post(base, { url: link.trim(), name: name.trim() });
      setName(''); setLink('');
    }, 'Design added.');
  }
  function rename(d) {
    const n = window.prompt('Design name', d.name);
    if (n === null || n.trim().length < 2) return;
    act(() => patch(base + '/' + d.id, { name: n.trim() }), 'Design renamed.');
  }

  return (
    <div className="card">
      <h2>Ready-made designs</h2>
      <p className="muted">Designs customers can pick to have printed on this product. They then show on the job screen. Removed designs go to the archive.</p>
      {!cur.length ? <p className="muted">No designs yet.</p> : null}
      {cur.map((d) => (
        <div className="mrow" key={d.id}>
          <img className="thumb" src={mediaUrl(d.url)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
          <span className="grow">{d.name}</span>
          <button type="button" className="line sm" disabled={busy} onClick={() => rename(d)}>Rename</button>
          <button type="button" className="danger sm" disabled={busy} onClick={() => act(() => post(base + '/' + d.id + '/archive', {}), 'Design moved to the archive.')}>Remove</button>
        </div>
      ))}
      <h3>Add a design</h3>
      <label>Design name<input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
      <div className="mrow">
        <label className="filebtn">Choose an image<input type="file" hidden accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={addFile} /></label>
        <span className="muted">or paste a link:</span>
      </div>
      <div className="mrow">
        <input style={{ flex: 1, minWidth: '180px' }} placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
        <button type="button" disabled={busy || !link.trim()} onClick={addLink}>Add by link</button>
      </div>
      {arch.length ? (
        <>
          <h3>Archive</h3>
          {arch.map((d) => (
            <div className="mrow" key={d.id}>
              <img className="thumb" src={mediaUrl(d.url)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              <span className="grow muted">{d.name}{d.archivedBy ? ' (removed by ' + d.archivedBy + ')' : ''}</span>
              <button type="button" className="line sm" disabled={busy} onClick={() => act(() => post(base + '/' + d.id + '/restore', {}), 'Design restored.')}>Restore</button>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

function MenuBox({ sku, nodes, picks, setPicks, act, busy }) {
  const [f, setF] = useState('');
  const shown = nodes.filter((n) => n.path.toLowerCase().includes(f.trim().toLowerCase()));
  const toggle = (slug) => setPicks(picks.includes(slug) ? picks.filter((s) => s !== slug) : [...picks, slug]);
  return (
    <div className="card">
      <h2>Where it appears in the shop menu</h2>
      <p className="muted">Pick up to 12 places. Selected: {picks.length}.</p>
      <input placeholder="Filter the list" value={f} onChange={(e) => setF(e.target.value)} />
      <div className="scroll">
        {shown.map((n) => (
          <label key={n.slug} style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={picks.includes(n.slug)} onChange={() => toggle(n.slug)} />
            {n.path}
          </label>
        ))}
        {!shown.length ? <p className="muted">Nothing matches.</p> : null}
      </div>
      <button type="button" disabled={busy || picks.length > 12} onClick={() => act(() => put(C + '/items/' + sku + '/menu', { slugs: picks }), 'Menu places saved.')}>Save menu places</button>
    </div>
  );
}

export default function ProductEdit() {
  const { sku } = useParams();
  const [d, setD] = useState(null);
  const [form, setForm] = useState(null);
  const [cats, setCats] = useState([]);
  const [shops, setShops] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [picks, setPicks] = useState([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (resetForm) => {
    const r = await get(C + '/items/' + sku);
    setD(r);
    if (resetForm) setForm(toForm(r.item));
  }, [sku]);

  useEffect(() => {
    load(true).catch((e) => setErr(e.message));
    get(C + '/categories').then((x) => setCats(x.categories || [])).catch(() => {});
    get(C + '/storefronts').then((x) => setShops(x.storefronts || [])).catch(() => {});
    get(C + '/menu').then((x) => setNodes(x.nodes || [])).catch(() => {});
    get(C + '/items/' + sku + '/menu').then((x) => setPicks(x.slugs || [])).catch(() => {});
  }, [sku, load]);

  async function act(fn, okMsg) {
    setErr(''); setOk(''); setBusy(true);
    try { await fn(); await load(false); if (okMsg) setOk(okMsg); } catch (x) { setErr(x.message); }
    setBusy(false);
  }

  async function save() {
    setErr(''); setOk('');
    let body;
    try { body = toBody(form); } catch (x) { return setErr(x.message); }
    setBusy(true);
    try { await patch(C + '/items/' + sku, body); await load(true); setOk('Saved.'); } catch (x) { setErr(x.message); }
    setBusy(false);
  }

  if (!d || !form) return <p className="center">{err || 'Loading...'}</p>;
  const live = d.item.status === 'active';
  const quote = form.priceType === 'quote';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleIn = (k, v) => setForm({ ...form, [k]: form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v] });

  return (
    <div>
      <p><Link to="/products">&larr; All products</Link></p>
      <h1 className="center">{d.item.name}</h1>
      <p className="center muted">{d.item.sku} &middot; <span className={'pill ' + (live ? 'signed_off' : '')}>{live ? 'On sale' : 'Draft'}</span></p>
      {err ? <p className="err center">{err}</p> : null}
      {ok ? <p className="ok center">{ok}</p> : null}

      <div className="card">
        <h2>Details</h2>
        <div className="grid2">
          <F label="Name"><input value={form.name} onChange={set('name')} /></F>
          <F label="Type">
            <select value={form.type} onChange={set('type')}>
              <option value="product">Product</option>
              <option value="service">Service</option>
            </select>
          </F>
          <F label="Category">
            <input list="pe-cats" value={form.category} onChange={set('category')} />
            <datalist id="pe-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
          </F>
          <F label="Subcategory (optional)"><input value={form.subcategory} onChange={set('subcategory')} /></F>
        </div>
        <F label="Description"><textarea rows={5} value={form.description} onChange={set('description')} /></F>
        <F label="Features (one per line)"><textarea rows={4} value={form.features} onChange={set('features')} /></F>

        <h3>Price</h3>
        {live ? <p className="muted">This product is on sale, so the price is locked. Changing it needs approval from all three partners (that screen comes in 7c).</p> : null}
        <div className="grid2">
          <F label="Price type">
            <select value={form.priceType} onChange={set('priceType')} disabled={live}>
              <option value="fixed">Fixed price</option>
              <option value="from">Starting from</option>
              <option value="quote">By quote</option>
            </select>
          </F>
          <F label="Price (KES)"><input type="number" min="0" value={quote ? '' : form.priceKes} disabled={live || quote} onChange={set('priceKes')} /></F>
          <F label="Old price shown struck through (KES, optional)"><input type="number" min="0" value={quote ? '' : form.compareAt} disabled={live || quote} onChange={set('compareAt')} /></F>
          <F label="Minimum order quantity"><input type="number" min="1" value={form.minOrderQty} onChange={set('minOrderQty')} /></F>
        </div>

        <h3>Stock</h3>
        <div className="grid2">
          <F label="Stock status">
            <select value={form.stockStatus} onChange={set('stockStatus')}>
              <option value="in_stock">In stock</option>
              <option value="made_to_order">Made to order</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </F>
          <F label="Stock quantity (optional)"><input type="number" min="0" value={form.stockQty} onChange={set('stockQty')} /></F>
          <F label="Lead time in days (optional)"><input type="number" min="0" value={form.leadTimeDays} onChange={set('leadTimeDays')} /></F>
          <F label="Dealer code (empty means Pyfon Brands makes it)"><input value={form.vendor} onChange={set('vendor')} /></F>
        </div>

        <h3>Options and personalization</h3>
        {form.optionsLocked ? (
          <p className="muted">This product has options in a format this screen cannot edit yet, so they are left as they are.</p>
        ) : (
          <F label="Options, one group per line, like  Colour: Red|Blue|Green"><textarea rows={3} value={form.options} onChange={set('options')} /></F>
        )}
        <div className="checks">
          {PERS.map((p) => (
            <label key={p}><input type="checkbox" checked={form.personalization.includes(p)} onChange={() => toggleIn('personalization', p)} />Customer can add {p}</label>
          ))}
        </div>

        <h3>Where it is sold</h3>
        <div className="checks">
          {shops.map((s) => (
            <label key={s}><input type="checkbox" checked={form.storefronts.includes(s)} onChange={() => toggleIn('storefronts', s)} />{s}</label>
          ))}
        </div>
        <F label="Tags (separated by commas)"><input value={form.tags} onChange={set('tags')} /></F>
        <div className="checks">
          <label><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />Featured on the home page</label>
        </div>
        <button type="button" disabled={busy} onClick={save}>{busy ? 'Please wait...' : 'Save details'}</button>
      </div>

      <Photos sku={sku} images={d.images} act={act} busy={busy} />
      <Designs sku={sku} designs={d.designs} act={act} busy={busy} />
      <MenuBox sku={sku} nodes={nodes} picks={picks} setPicks={setPicks} act={act} busy={busy} />

      <div className="card">
        <h2>{live ? 'On sale' : 'Draft (hidden from customers)'}</h2>
        {live ? (
          <p className="muted">Taking it off sale needs approval from all three partners (that screen comes in 7c).</p>
        ) : (
          <>
            <p className="muted">To publish it needs a price (unless by quote), at least one shop and at least one photo. Save your details first.</p>
            <button type="button" disabled={busy} onClick={() => act(() => post(C + '/items/' + sku + '/publish', {}), 'Published. It is now on sale.')}>Publish</button>
          </>
        )}
      </div>
    </div>
  );
}
