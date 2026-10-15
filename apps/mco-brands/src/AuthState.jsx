import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokens } from './api.js';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokens.get()) { setReady(true); return; }
    api.auth.me()
      .then((d) => setUser(d.user || d))
      .catch(() => tokens.clear())
      .finally(() => setReady(true));
  }, []);

  async function login(email, password) {
    const d = await api.auth.login(email, password);
    tokens.set(d.token);
    setUser(d.user);
    return d;
  }
  async function register(email, password, fullName) {
    await api.auth.register(email, password, fullName);
    return login(email, password);
  }
  function logout() {
    tokens.clear();
    setUser(null);
  }

  return <Ctx.Provider value={{ user, ready, login, register, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export const displayName = (u) => (u && (u.full_name || u.fullName || u.email)) || '';
