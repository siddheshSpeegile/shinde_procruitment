import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ROUTES } from '../../router/routes';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Spinner } from '../ui';
import NotificationBell from '../NotificationBell';

export default function AppLayout() {
  const { user, can, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  // Small screens: the sidebar is a slide-in drawer. From md up it is always visible.
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  const groups = [];
  ROUTES.filter((r) => r.label && r.menu !== false && can(r.perm)).forEach((r) => {
    let g = groups.find((x) => x.name === r.group);
    if (!g) groups.push((g = { name: r.group, items: [] }));
    g.items.push(r);
  });

  return (
    <div className="flex h-full">
      {open && <div className="md:hidden fixed inset-0 z-30 bg-black/50 no-print" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside id="sidebar" aria-label="Menu"
        className={`w-60 flex-none bg-side text-[#e8e2de] flex flex-col no-print fixed inset-y-0 left-0 z-40 md:static md:translate-x-0 md:visible transition-[transform,visibility] duration-200 ${open ? 'translate-x-0 visible' : '-translate-x-full invisible'}`}>
        <div className="h-[60px] flex items-center gap-2.5 px-4 border-b border-white/10">
          <Link to="/" className="flex-1 flex items-center" aria-label="Shinde Shoes - Dashboard">
            <span className="bg-white rounded-lg px-2 h-[46px] flex items-center"><img src="/logo-sidebar.jpg" alt="Shinde Shoes" className="h-[38px] w-auto block" /></span>
          </Link>
          <button type="button" className="md:hidden w-9 h-9 rounded-md text-xl text-[#d9d1cc] hover:bg-white/10" aria-label="Close menu" onClick={() => setOpen(false)}>&times;</button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Main">
          {groups.map((g) => (
            <div key={g.name} className="mb-2">
              <div className="px-4 py-1 text-[10.5px] uppercase tracking-widest text-[#a79d98]">{g.name}</div>
              {g.items.map((r) => (
                <NavLink key={r.path} to={r.path} end={r.path === '/'} onClick={() => setOpen(false)}
                  className={({ isActive }) => `block mx-2 px-3 py-2 md:py-1.5 rounded-md text-[13px] no-underline ${isActive ? 'bg-[#8a3230] text-white' : 'text-[#d9d1cc] hover:bg-white/10 hover:text-white'}`}>
                  {r.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[60px] flex-none flex items-center justify-between md:justify-end gap-2 sm:gap-3 px-3 sm:px-6 border-b border-line bg-surface no-print">
          <div className="flex items-center gap-2 md:hidden">
            <button type="button" className="btn btn-sm !h-9 !w-9 !px-0" aria-label="Open menu" aria-expanded={open} aria-controls="sidebar" onClick={() => setOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
            <Link to="/" aria-label="Dashboard" className="flex items-center"><img src="/logo-sidebar.jpg" alt="Shinde Shoes" className="h-8 w-auto block" /></Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <NotificationBell />
            <button className="btn btn-sm" onClick={toggle}>
              <span className="sm:hidden">{theme === 'dark' ? 'Light' : 'Dark'}</span>
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <div className="text-right leading-tight min-w-0 hidden xs:block max-w-[110px] sm:max-w-none">
              <div className="font-medium truncate">{user?.username}</div>
              <div className="text-xs text-muted truncate hidden sm:block">{user?.role_name || user?.role}</div>
            </div>
            <button className="btn btn-sm" onClick={() => { logout(); nav('/login'); }}>Sign out</button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
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
