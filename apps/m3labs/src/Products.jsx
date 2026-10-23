import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { P, kes } from './api.js';
import { get, post, patch, mediaUrl } from './http.js';

const C = P + '/catalog';
const SHOPN = { prestige: 'Pyfon Gift Hub', trim: 'TriM Atelier', mco: 'M & Co. Brands' };
const STOCK = { in_stock: 'In stock', made_to_order: 'Made to order', out_of_stock: 'Out of stock' };
const price = (i) => (i.priceType === 'quote' ? 'By quote' : i.priceKes == null ? 'No price' : (i.priceType === 'from' ? 'From ' : '') + kes(i.priceKes));
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12, margin: '16px 0' };

function Tile({ title, note, onClick, onRename, plus }) {
  return (
    <div className="card" style={{ textAlign: 'center', cursor: 'pointer', margin: 0, padding: 18, borderStyle: plus ? 'dashed' : 'solid' }} onClick={onClick}>
      <b style={{ fontSize: 17 }}>{plus ? '+ ' : ''}{title}</b>
      {note ? <p className="muted" style={{ margin: '6px 0 0' }}>{note}</p> : null}
      {onRename ? <button type="button" className="line sm" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); onRename(); }}>Rename</button> : null}
    </div>
  );
}

export default function Products() {
  const nav = useNavigate();
  const [go, setGo] = useState(false);
  const [shops, setShops] = useState(null);
  const [shop, setShop] = useState(null);
  const [tree, setTree] = useState(null);
  const [cat, setCat] = useState(null);
  const [nodes, setNodes] = useState(null);
  const [path, setPath] = useState([]);
  const [none, setNone] = useState(false);
  const [all, setAll] = useState(false);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('all');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(null);
  const [nm, setNm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const sp = shop && shop !== 'all' ? '&shop=' + shop : '';

  useEffect(() => { if (go && !shops) get(C + '/browse/shops').then(setShops).catch((e) => setErr(e.message)); }, [go, shops]);
  const loadTree = useCallback(() => get(C + '/browse/tree?x=1' + sp).then((d) => setTree(d.categories || [])).catch((e) => setErr(e.message)), [sp]);
  useEffect(() => { if (shop) loadTree(); }, [shop, loadTree]);
  const loadNodes = useCallback(() => get(C + '/browse/nodes?category=' + (cat ? cat.slug : '') + sp).then((d) => setNodes(d.nodes || [])).catch((e) => setErr(e.message)), [cat, sp]);
  useEffect(() => { if (cat) { setNodes(null); loadNodes(); } }, [cat, loadNodes]);

  const cur = path.length ? path[path.length - 1] : null;
  const vis = (n) => shop === 'all' || n.count > 0 || n.total === 0;
  const kids = nodes ? nodes.filter((n) => (cur ? n.parentId === cur.id : n.parentId === null) && vis(n)) : [];
  const hasKids = cur && nodes ? nodes.some((n) => n.parentId === cur.id) : false;
  const curCat = tree && cat ? tree.find((c) => c.id === cat.id) : null;
  const noSub = curCat ? curCat.noSub : 0;
  const itemsView = !!cat && (none || (cur && nodes && (all || !hasKids)));

  const loadItems = useCallback(async () => {
    if (!cat || !itemsView) return;
    try {
      const p = new URLSearchParams({ status, page: String(page), limit: '25', category: cat.slug });
      if (none) p.set('sub', '__none__'); else if (cur.parentId === null) p.set('sub', cur.name); else p.set('node', cur.slug);
      if (q) p.set('q', q);
      setData(await get(C + '/browse/items?' + p.toString() + sp));
    } catch (e) { setErr(e.message); }
  }, [cat, itemsView, none, cur, status, page, q, sp]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const resetCat = () => { setCat(null); setPath([]); setNone(false); setAll(false); setData(null); setNodes(null); };
  const crumbs = [['All products', () => { setShop(null); resetCat(); }]];
  if (shop) crumbs.push([shop === 'all' ? 'All shops' : SHOPN[shop] || shop, resetCat]);
  if (cat) crumbs.push([cat.name, () => { setPath([]); setNone(false); setAll(false); setData(null); }]);
  path.forEach((n, i) => crumbs.push([n.name, i === path.length - 1 && !all ? null : () => { setPath(path.slice(0, i + 1)); setAll(false); setData(null); }]));
  if (all) crumbs.push(['All items here', null]);
  if (none) crumbs.push(['No subcategory', null]);

  async function run(fn) {
    setErr(''); setBusy(true);
    try { await fn(); await loadTree(); if (cat) await loadNodes(); setAdding(null); setNm(''); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  const rename = (p, old) => { const n = window.prompt('New name', old); if (n && n.trim().length > 1 && n.trim() !== old) run(() => patch(C + p, { name: n.trim() })); };
  const addCat = () => run(() => post(C + '/groups/categories', { name: nm.trim() }));
  const addSub = () => run(() => post(C + '/browse/nodes', { category: cat.slug, parentId: cur ? cur.id : null, name: nm.trim() }));
  async function addItem() {
    setErr(''); setBusy(true);
    try {
      const body = { name: nm.trim(), category: cat.name, type: 'product' };
      if (path.length) body.subcategory = path[0].name;
      if (path.length > 1) body.tags = path.map((n) => 'node:' + n.slug);
      if (shop && shop !== 'all') body.storefronts = [shop];
      const d = await post(C + '/items', body);
      nav('/products/' + d.item.sku);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  const open = (n) => { setPath([...path, n]); setAll(false); setData(null); setPage(1); };
  const addBox = (kind, label, fn) => (adding === kind ? (
    <form className="card" style={{ margin: '12px 0' }} onSubmit={(e) => { e.preventDefault(); if (nm.trim().length > 1) fn(); }}>
      <label>{label}<input autoFocus value={nm} onChange={(e) => setNm(e.target.value)} /></label>
      <button type="submit" disabled={busy || nm.trim().length < 2}>{busy ? 'Please wait...' : 'Add'}</button>{' '}
      <button type="button" className="line" onClick={() => { setAdding(null); setNm(''); }}>Cancel</button>
    </form>
  ) : null);

  return (
    <div>
      <h1 className="center">Products</h1>
      {go ? <p className="crumb center">{crumbs.map((c, i) => <span key={i}>{i ? ' \u203a ' : ''}{c[1] ? <a href="#x" onClick={(e) => { e.preventDefault(); c[1](); }}>{c[0]}</a> : <b>{c[0]}</b>}</span>)}</p> : null}
      {err ? <p className="err center">{err}</p> : null}

      {!go ? (
        <div style={{ textAlign: 'center', padding: '70px 0' }}>
          <button type="button" style={{ fontSize: 22, padding: '20px 56px', borderRadius: 14 }} onClick={() => setGo(true)}>All products</button>
          <p className="muted">Start here, then pick a shop, a category and a subcategory.</p>
        </div>
      ) : null}

      {go && !shop ? (
        !shops ? <p className="center muted">Loading...</p> : (
          <div style={grid}>
            <Tile title="All shops" note={shops.total + ' products'} onClick={() => setShop('all')} />
            {shops.shops.map((s) => <Tile key={s.code} title={SHOPN[s.code] || s.code} note={s.count + ' listed'} onClick={() => setShop(s.code)} />)}
          </div>
        )
      ) : null}

      {shop && !cat ? (
        <>
          {!tree ? <p className="center muted">Loading...</p> : null}
          <div style={grid}>
            {tree ? tree.map((c) => <Tile key={c.id} title={c.name} note={c.count + ' products'} onClick={() => setCat({ id: c.id, name: c.name, slug: c.slug })} onRename={() => rename('/groups/categories/' + c.id, c.name)} />) : null}
            {tree ? <Tile plus title="Add category" onClick={() => { setAdding('cat'); setNm(''); }} /> : null}
          </div>
          {addBox('cat', 'New category name', addCat)}
        </>
      ) : null}

      {cat && !itemsView ? (
        <>
          {!nodes ? <p className="center muted">Loading...</p> : (
            <div style={grid}>
              {kids.map((n) => <Tile key={n.id} title={n.name} note={n.count + ' products'} onClick={() => open(n)} onRename={() => rename('/groups/subcategories/' + n.id, n.name)} />)}
              {cur ? <Tile title="All items here" note={cur.count + ' products'} onClick={() => setAll(true)} /> : null}
              {!cur && noSub ? <Tile title="No subcategory" note={noSub + ' products'} onClick={() => setNone(true)} /> : null}
              <Tile plus title="Add subcategory" onClick={() => { setAdding('sub'); setNm(''); }} />
              <Tile plus title="Add item" onClick={() => { setAdding('item'); setNm(''); }} />
            </div>
          )}
          {addBox('sub', 'New subcategory name', addSub)}
          {addBox('item', 'New product name (saved as a draft)', addItem)}
        </>
      ) : null}

      {itemsView ? (
        <>
          <div className="card">
            <form className="mrow" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(text.trim()); }}>
              <input style={{ flex: 1, minWidth: 140 }} placeholder="Search name or code" value={text} onChange={(e) => setText(e.target.value)} />
              <select style={{ width: 'auto' }} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
                <option value="all">All</option><option value="active">On sale</option><option value="draft">Drafts</option>
              </select>
              <button type="submit">Search</button>
              <button type="button" onClick={() => { setAdding(adding === 'item' ? null : 'item'); setNm(''); }}>Add item</button>
            </form>
            {addBox('item', 'New product name (saved as a draft)', addItem)}
          </div>
          <div className="card" style={{ overflowX: 'auto' }}>
            {!data ? <p className="muted center">Loading...</p> : null}
            {data && !data.items.length ? <p className="muted center">No products here yet.</p> : null}
            {data && data.items.length ? (
              <table className="ptable">
                <thead><tr><th /><th>Name</th><th>Code</th><th>Type</th><th>Status</th><th>Price</th><th>Stock</th><th>Lead time</th><th>Dealer</th><th>Shops</th><th>Tags</th><th>Featured</th></tr></thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.sku} onClick={() => nav('/products/' + i.sku)}>
                      <td>{i.image ? <img className="thumb" src={mediaUrl(i.image)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <span className="thumb" />}</td>
                      <td><Link to={'/products/' + i.sku} onClick={(e) => e.stopPropagation()}><b>{i.name}</b></Link></td>
                      <td>{i.sku}</td>
                      <td>{i.type}</td>
                      <td><span className={'pill ' + (i.status === 'active' ? 'signed_off' : '')}>{i.status === 'active' ? 'On sale' : 'Draft'}</span></td>
                      <td>{price(i)}</td>
                      <td>{STOCK[i.stockStatus] || i.stockStatus}{i.stockQty != null ? ' (' + i.stockQty + ')' : ''}</td>
                      <td>{i.leadTimeDays != null ? i.leadTimeDays + ' days' : '-'}</td>
                      <td>{i.vendor || 'Pyfon'}</td>
                      <td>{i.shops.join(', ') || '-'}</td>
                      <td>{i.tags.filter((t) => !t.startsWith('node:')).slice(0, 4).join(', ')}</td>
                      <td>{i.featured ? 'Yes' : ''}</td>
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
        </>
      ) : null}
    </div>
  );
}
