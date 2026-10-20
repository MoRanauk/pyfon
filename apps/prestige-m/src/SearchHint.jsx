import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Lets a page tell the search bar what it is showing (used by the product page).
const Ctx = createContext({ hint: {}, setHint: () => {}, clear: () => {} });

export function SearchHintProvider({ children }) {
  const [hint, setHint] = useState({});
  const clear = useCallback(() => setHint({}), []);
  const value = useMemo(() => ({ hint, setHint, clear }), [hint, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSearchHint = () => useContext(Ctx);
