import { Suspense } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ROUTES } from '../../router/routes';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Spinner, useApiStatus } from '../ui';

export default function AppLayout() {
  const { user, can, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const status = useApiStatus();

  const groups = [];
  ROUTES.filter((r) => r.label && can(r.perm)).forEach((r) => {
    let g = groups.find((x) => x.name === r.group);
    if (!g) groups.push((g = { name: r.group, items: [] }));
    g.items.push(r);
  });

  return (
    <div className="flex h-full">
      <aside className="w-60 flex-none bg-side text-[#e8e2de] flex flex-col no-print">
        <div className="h-[60px] flex items-center gap-2.5 px-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-md bg-[#8a3230] text-white font-semibold flex items-center justify-center">S</div>
          <div><div className="font-semibold tracking-widest">SHINDE</div><div className="text-[11px] text-[#a79d98]">Procurement admin</div></div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Main">
          {groups.map((g) => (
            <div key={g.name} className="mb-2">
              <div className="px-4 py-1 text-[10.5px] uppercase tracking-widest text-[#a79d98]">{g.name}</div>
              {g.items.map((r) => (
                <NavLink key={r.path} to={r.path} end={r.path === '/'}
                  className={({ isActive }) => `block mx-2 px-3 py-1.5 rounded-md text-[13px] no-underline ${isActive ? 'bg-[#8a3230] text-white' : 'text-[#d9d1cc] hover:bg-white/10 hover:text-white'}`}>
                  {r.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[60px] flex-none flex items-center justify-end gap-3 px-6 border-b border-line bg-surface no-print">
          <span className="text-xs flex items-center gap-1.5 text-muted" title="GET /api/health">
            <span className="w-2 h-2 rounded-full" style={{ background: status === 'online' ? 'var(--ok)' : status === 'offline' ? 'var(--bad)' : '#bbb' }} />
            API {status}
          </span>
          <button className="btn btn-sm" onClick={toggle}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
          <div className="text-right leading-tight">
            <div className="font-medium">{user?.username}</div>
            <div className="text-xs text-muted">{user?.role}</div>
          </div>
          <button className="btn btn-sm" onClick={() => { logout(); nav('/login'); }}>Sign out</button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <Suspense fallback={<Spinner />}><Outlet /></Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
