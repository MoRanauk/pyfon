import { useState } from 'react';
import { P } from './api.js';
import { post, patch } from './http.js';

const G = P + '/catalog/groups';

export default function Tree({ tree, sel, total, onSelect, onChanged, onError }) {
  const [open, setOpen] = useState({});
  const [ed, setEd] = useState(null);
  const here = (kind, id) => Boolean(ed && ed.kind === kind && ed.id === id);

  async function save(e) {
    e.preventDefault();
    const v = ed.value.trim();
    if (v.length < 2) return onError('Type at least 2 letters.');
    try {
      if (ed.kind === 'addcat') await post(G + '/categories', { name: v });
      if (ed.kind === 'addsub') await post(G + '/categories/' + ed.id + '/subcategories', { name: v });
      if (ed.kind === 'cat') await patch(G + '/categories/' + ed.id, { name: v });
      if (ed.kind === 'sub') await patch(G + '/subcategories/' + ed.id, { name: v });
      if (ed.kind === 'sub' && sel.sub === ed.old) onSelect(sel.cat, v);
      if (ed.kind === 'addsub') setOpen({ ...open, [ed.id]: true });
      setEd(null);
      onError('');
      onChanged();
    } catch (x) { onError(x.message); }
  }

  const form = (hint) => (
    <form className="tedit" onSubmit={save}>
      <input autoFocus value={ed.value} placeholder={hint} onChange={(e) => setEd({ ...ed, value: e.target.value })} />
      <button type="submit" className="sm">Save</button>
      <button type="button" className="line sm" onClick={() => setEd(null)}>Cancel</button>
    </form>
  );

  return (
    <aside className="tree">
      <button type="button" className={'trow all' + (!sel.cat ? ' on' : '')} onClick={() => onSelect(null, null)}>All products <i>{total}</i></button>
      {tree.map((c) => (
        <div key={c.id}>
          {here('cat', c.id) ? form('Category name') : (
            <div className={'trow' + (sel.cat === c.slug && !sel.sub ? ' on' : '')}>
              <button type="button" className="chev" aria-label="Show or hide subcategories" onClick={() => setOpen({ ...open, [c.id]: !open[c.id] })}>{open[c.id] ? '\u25be' : '\u25b8'}</button>
              <button type="button" className="tname" onClick={() => { onSelect(c.slug, null); setOpen({ ...open, [c.id]: true }); }}>{c.name} <i>{c.count}</i></button>
              <button type="button" className="tbtn" onClick={() => setEd({ kind: 'cat', id: c.id, value: c.name })}>Rename</button>
            </div>
          )}
          <div className="tsubs">
            {open[c.id] ? c.subs.map((s) => (here('sub', s.id) ? <div key={s.id}>{form('Subcategory name')}</div> : (
              <div key={s.id} className={'trow' + (sel.cat === c.slug && sel.sub === s.name ? ' on' : '')}>
                <button type="button" className="tname" onClick={() => onSelect(c.slug, s.name)}>{s.name} <i>{s.count}</i></button>
                <button type="button" className="tbtn" onClick={() => setEd({ kind: 'sub', id: s.id, old: s.name, value: s.name })}>Rename</button>
              </div>
            ))) : null}
            {here('addsub', c.id) ? form('New subcategory') : <button type="button" className="tbtn" onClick={() => setEd({ kind: 'addsub', id: c.id, value: '' })}>+ Add subcategory</button>}
          </div>
        </div>
      ))}
      {here('addcat', 'new') ? form('New category') : <button type="button" className="tbtn" onClick={() => setEd({ kind: 'addcat', id: 'new', value: '' })}>+ Add category</button>}
    </aside>
  );
}
