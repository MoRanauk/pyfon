import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokens, STAGE } from './api.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!STAGE || !tokens.get()) { setReady(true); return; }
    api.auth.me()
      .then((d) => setUser(d.user || d))
      .catch(() => tokens.clear())
      .finally(() => setReady(true));
  }, []);

  async function login(email, password) {
    const d = await api.auth.login(email, password);
    if (d.mustChangePassword) {
      throw new Error('Your password is temporary. Tap "Change password" under the password box to set a new one.');
    }
    const want = STAGE === 'dev' ? 'developer' : 'partner';
    if (!d.user || d.user.role !== want) {
      throw new Error(STAGE === 'dev' ? 'This desk is for the developer account only.' : 'This portal is for partners only.');
    }
    tokens.set(d.token);
    setUser(d.user);
  }
  function logout() {
    tokens.clear();
    setUser(null);
  }
  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
export const nameOf = (u) => (u && (u.full_name || u.fullName || u.email)) || '';
