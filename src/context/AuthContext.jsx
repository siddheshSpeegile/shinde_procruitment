import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi, rolesApi } from '../api/endpoints';
import { setUserProvider } from '../api/client';
import { PERMISSION_MODE } from '../config';

const KEY = 'shinde_admin_session';
const Ctx = createContext(null);
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
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } });
  const userRef = useRef(session?.user);
  userRef.current = session?.user;
  useEffect(() => { setUserProvider(() => userRef.current); }, []);

  const persist = (s) => { setSession(s); s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); };

  const login = useCallback(async (username, password) => {
    const user = await authApi.login(username, password);
    userRef.current = user;
    const perms = await resolvePermissions(user);
    persist({ user, perms });
    return user;
  }, []);

  const logout = useCallback(() => persist(null), []);

  const refreshPermissions = useCallback(async () => {
    if (!userRef.current) return;
    const perms = await resolvePermissions(userRef.current);
    persist({ user: userRef.current, perms });
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
