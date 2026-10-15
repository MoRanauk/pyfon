import { createContext, useContext, useEffect, useState } from 'react';
import { api, STORE } from './api.js';

const Ctx = createContext({ cats: [], all: [], ready: false, error: '' });

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
  const [state, setState] = useState({ cats: [], all: [], ready: false, error: '' });
  useEffect(() => {
    let live = true;
    Promise.all([api.catalog.categories(STORE), loadAll()])
      .then(([c, all]) => { if (live) setState({ cats: c.categories, all, ready: true, error: '' }); })
      .catch((e) => { if (live) setState({ cats: [], all: [], ready: true, error: e.message }); });
    return () => { live = false; };
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useCatalog = () => useContext(Ctx);
