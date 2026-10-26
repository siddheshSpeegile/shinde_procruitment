import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi, rolesApi } from '../api/endpoints';
import { setTokenProvider, setUserProvider } from '../api/client';
import { PERMISSION_MODE } from '../config';

const KEY = 'shinde_admin_session';
// A sign-in lasts one hour from the moment you sign in. It is not extended by activity.
export const SESSION_MS = 60 * 60 * 1000;
export const EXPIRED_KEY = 'shinde_session_expired';
const Ctx = createContext(null);

function flagExpired() { try { sessionStorage.setItem(EXPIRED_KEY, '1'); } catch { /* storage blocked */ } }
function readSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (!s) return null;
    if (!s.expiresAt || s.expiresAt <= Date.now()) { localStorage.removeItem(KEY); flagExpired(); return null; }
    return s;
  } catch { return null; }
}
export const useAuth = () => useContext(Ctx);

const roleName = (r) => String(r.role_name ?? r.name ?? r.role ?? '');
export const isAdminRole = (name) => /^admin/i.test(String(name || ''));

/** POST /auth/login returns no permissions, so look the role up in /roles and read its permission keys. */
async function resolvePermissions(user) {
  // "User".role only holds 'admin'/'user'; login also returns role_id / role_name from the role table.
  const label = user.role_name || user.role;
  if (PERMISSION_MODE === 'open') return { all: true, keys: [], note: 'VITE_PERMISSION_MODE=open' };
  if (isAdminRole(label)) return { all: true, keys: [], note: 'Administrator has every permission' };
  try {
    const roles = await rolesApi.list();
    const r = user.role_id
      ? roles.find((x) => String(x.role_id ?? x.id) === String(user.role_id))
      : roles.find((x) => roleName(x).toLowerCase() === String(user.role).toLowerCase());
    if (!r) return { all: false, keys: [], note: `Role "${label}" was not found in the role table` };
    const perms = await rolesApi.permissionsOf(r.role_id ?? r.id);
    return { all: false, keys: perms.map((p) => p.permission_key), roleId: r.role_id ?? r.id, note: '' };
  } catch (e) {
    return { all: false, keys: [], note: `Could not load permissions: ${e.message}` };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const userRef = useRef(session?.user);
  userRef.current = session?.user;
  const expiresRef = useRef(session?.expiresAt);
  expiresRef.current = session?.expiresAt;
  const tokenRef = useRef(session?.token);
  tokenRef.current = session?.token;
  setUserProvider(() => userRef.current); // set while rendering, so child components can use it in their first effects
  setTokenProvider(() => tokenRef.current);

  const persist = (s) => { setSession(s); s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); };

  const login = useCallback(async (username, password) => {
    const { token, ...user } = await authApi.login(username, password); // token proves who you are to the Users screen
    userRef.current = user;
    tokenRef.current = token;
    const perms = await resolvePermissions(user);
    try { sessionStorage.removeItem(EXPIRED_KEY); } catch { /* storage blocked */ }
    persist({ user, perms, token, expiresAt: Date.now() + SESSION_MS });
    return user;
  }, []);

  const logout = useCallback(() => persist(null), []);

  // Refreshing permissions must not extend the hour.
  const refreshPermissions = useCallback(async () => {
    if (!userRef.current) return;
    const perms = await resolvePermissions(userRef.current);
    persist({ user: userRef.current, perms, token: tokenRef.current, expiresAt: expiresRef.current });
  }, []);

  // Sign out automatically when the hour is up (checked every 15 s and when the tab regains focus).
  useEffect(() => {
    if (!session) return undefined;
    const check = () => { if (Date.now() >= session.expiresAt) { flagExpired(); persist(null); } };
    check();
    const id = setInterval(check, 15000);
    window.addEventListener('focus', check);
    return () => { clearInterval(id); window.removeEventListener('focus', check); };
  }, [session]);

  // The server said the sign-in is no longer valid (expired token, or the account was switched off).
  useEffect(() => {
    const onExpired = () => { flagExpired(); persist(null); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const value = useMemo(() => {
    const perms = session?.perms || { all: false, keys: [] };
    const keySet = new Set(perms.keys);
    return {
      user: session?.user || null,
      perms,
      login, logout, refreshPermissions,
      can: (key) => !key || perms.all || keySet.has(key),
    };
  }, [session, login, logout, refreshPermissions]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
