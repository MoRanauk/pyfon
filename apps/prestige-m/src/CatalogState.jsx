import { createContext, useContext, useEffect, useState } from 'react';
import { api, STORE } from './api.js';
import { addExplore } from './tree.js';

const Ctx = createContext({ cats: [], all: [], tree: [], ready: false, error: '' });

// Loads the whole storefront catalog once (60 per page) for every page to share.
async function loadAll() {
  let all = [];
  let page = 1;
  let total = 0;
  do {
    const d = await api.catalog.items(STORE, { limit: 60, page });
    all = all.concat(d.items);
    total = d.total;
    page += 1;
  } while (all.length < total && page <= 6);
  return all;
}

export function CatalogProvider({ children }) {
  const [state, setState] = useState({ cats: [], all: [], tree: [], ready: false, error: '' });
  useEffect(() => {
    let live = true;
    // The tree loads on its own: if it fails, the shop still works.
    // addExplore puts Recently viewed and Designs picked for you under Explore.
    const treeP = api.catalog.tree(STORE).then((r) => addExplore(r.tree || [])).catch(() => []);
    Promise.all([api.catalog.categories(STORE), loadAll(), treeP])
      .then(([c, all, tree]) => { if (live) setState({ cats: c.categories, all, tree, ready: true, error: '' }); })
      .catch((e) => { if (live) setState({ cats: [], all: [], tree: [], ready: true, error: e.message }); });
    return () => { live = false; };
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useCatalog = () => useContext(Ctx);
