import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { P, kes } from './api.js';
import { get, post, mediaUrl } from './http.js';
import Tree from './Tree.jsx';

const C = P + '/catalog';
const price = (i) => (i.priceType === 'quote' ? 'By quote' : i.priceKes == null ? 'No price' : (i.priceType === 'from' ? 'From ' : '') + kes(i.priceKes));

export default function Products() {
  const nav = useNavigate();
  const [tree, setTree] = useState([]);
  const [sel, setSel] = useState({ cat: null, sub: null });
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [nf, setNf] = useState({ name: '', category: '' });
  const [busy, setBusy] = useState(false);

  const loadTree = useCallback(() => get(C + '/tree').then((d) => setTree(d.categories || [])).catch((e) => setErr(e.message)), []);
  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ status, page: String(page), limit: '20' });
      if (q) p.set('q', q);
      if (sel.cat) p.set('category', sel.cat);
      if (sel.sub) p.set('sub', sel.sub);
      setData(await get(C + '/items?' + p.toString()));
    } catch (e) { setErr(e.message); }
  }, [q, status, page, sel]);
  useEffect(() => { loadTree(); }, [loadTree]);
  useEffect(() => { load(); }, [load]);

  const cat = tree.find((c) => c.slug === sel.cat);
  const total = tree.reduce((n, c) => n + c.count, 0);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const pick = (c, s) => { setPage(1); setSel({ cat: c, sub: s }); };

  async function create(e) {
    e.preventDefault();
    setErr('');
    const category = nf.category || (cat ? cat.name : '');
    if (nf.name.trim().length < 2 || category.length < 2) return setErr('Enter a name and choose a category.');
    setBusy(true);
    try {
      const body = { name: nf.name.trim(), category, type: 'product' };
      if (cat && sel.sub && cat.name === category) body.subcategory = sel.sub;
      const d = await post(C + '/items', body);
      nav('/products/' + d.item.sku);
    } catch (x) { setErr(x.message); }
    setBusy(false);
  }

  return (
    <div>
      <h1 className="center">Products</h1>
      <p className="crumb">{cat ? cat.name : 'All categories'}{sel.sub ? ' \u203a ' + sel.sub : ''}</p>
      {err ? <p className="err center">{err}</p> : null}
      <div className="ptree">
        <Tree tree={tree} sel={sel} total={total} onSelect={pick} onChanged={() => { loadTree(); load(); }} onError={setErr} />
        <div>
          <div className="card">
            <form className="mrow" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(text.trim()); }}>
              <input style={{ flex: 1, minWidth: '140px' }} placeholder="Search name, code or category" value={text} onChange={(e) => setText(e.target.value)} />
              <select style={{ width: 'auto' }} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
                <option value="all">All</option><option value="active">On sale</option><option value="draft">Drafts</option>
              </select>
              <button type="submit">Search</button>
              <button type="button" onClick={() => setOpen(!open)}>{open ? 'Cancel' : 'New product'}</button>
            </form>
            {open ? (
              <form className="card" onSubmit={create}>
                <h3>New product (saved as a draft)</h3>
                <label>Name<input value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} /></label>
                <label>Category
                  <select value={nf.category || (cat ? cat.name : '')} onChange={(e) => setNf({ ...nf, category: e.target.value })}>
                    <option value="">Choose a category</option>
                    {tree.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </label>
                <button type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Create and continue'}</button>
              </form>
            ) : null}
          </div>
          <div className="card">
            {!data ? <p className="muted center">Loading...</p> : null}
            {data && !data.items.length ? <p className="muted center">No products here yet.</p> : null}
            {data && data.items.length ? (
              <table className="ptable">
                <thead><tr><th /><th>Name</th><th>Code</th><th>Category</th><th>Price</th><th>Status</th></tr></thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.sku} onClick={() => nav('/products/' + i.sku)}>
                      <td>{i.image ? <img className="thumb" src={mediaUrl(i.image)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <span className="thumb" />}</td>
                      <td data-l="Name"><Link to={'/products/' + i.sku} onClick={(e) => e.stopPropagation()}><b>{i.name}</b></Link></td>
                      <td data-l="Code">{i.sku}</td>
                      <td data-l="Category">{i.category}{i.subcategory ? ' \u203a ' + i.subcategory : ''}</td>
                      <td data-l="Price">{price(i)}</td>
                      <td data-l="Status"><span className={'pill ' + (i.status === 'active' ? 'signed_off' : '')}>{i.status === 'active' ? 'On sale' : 'Draft'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {data && data.total > data.limit ? (
              <div className="mrow" style={{ justifyContent: 'center' }}>
                <button type="button" className="line sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <span className="muted">Page {page} of {pages} &middot; {data.total} products</span>
                <button type="button" className="line sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
