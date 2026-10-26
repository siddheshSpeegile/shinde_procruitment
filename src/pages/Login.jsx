import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { AnimatePresence, motion } from 'framer-motion';
import { EXPIRED_KEY, useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const WORDS = ['Vendors', 'Products', 'Purchase orders', 'Roles and access'];
const STITCHES = [
  ['M-20 220 C 150 90, 300 330, 470 190 S 720 90, 840 190', '#c98f86', 'lg-march'],
  ['M-20 272 C 150 142, 300 382, 470 242 S 720 142, 840 242', '#c98f86', 'lg-march'],
  ['M-20 520 C 160 400, 330 600, 480 470 S 730 380, 840 460', '#e9a320', 'lg-march-slow'],
  ['M-20 572 C 160 452, 330 652, 480 522 S 730 432, 840 512', '#e9a320', 'lg-march-slow'],
];

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const root = useRef(null);
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  // Shown when the one-hour session ended (flag is set by AuthContext).
  const [err, setErr] = useState(() => {
    try { return sessionStorage.getItem(EXPIRED_KEY) ? 'Your session ended after 1 hour. Please sign in again.' : ''; } catch { return ''; }
  });
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  useEffect(() => { try { sessionStorage.removeItem(EXPIRED_KEY); } catch { /* storage blocked */ } }, []);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.lg-hero', { opacity: 0, y: 24, duration: 0.7, stagger: 0.14 })
        .from('.lg-logo', { opacity: 0, scale: 0.9, duration: 0.6 }, 0.15)
        .from('.lg-field', { opacity: 0, y: 16, duration: 0.5, stagger: 0.08 }, 0.35);

      // The stitched lines drift slightly against the pointer.
      const x = gsap.quickTo('.lg-stitch', 'x', { duration: 0.9, ease: 'power2.out' });
      const y = gsap.quickTo('.lg-stitch', 'y', { duration: 0.9, ease: 'power2.out' });
      const move = (e) => {
        const r = root.current.getBoundingClientRect();
        x(((e.clientX - r.left) / r.width - 0.5) * -28);
        y(((e.clientY - r.top) / r.height - 0.5) * -28);
      };
      const el = root.current;
      el.addEventListener('pointermove', move);
      return () => el.removeEventListener('pointermove', move);
    }, root);
    return () => mm.revert();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!u.trim() || !p) { setErr('Enter your username and password.'); setShake((n) => n + 1); return; }
    setBusy(true); setErr('');
    try { await login(u.trim(), p); nav(loc.state?.from || '/', { replace: true }); }
    catch (ex) { setErr(ex.message); setShake((n) => n + 1); }
    finally { setBusy(false); }
  }

  return (
    <div ref={root} className="h-full grid md:grid-cols-[1.15fr_minmax(360px,520px)] grid-rows-[minmax(0,1fr)]">
      <div className="relative hidden md:flex flex-col justify-end overflow-hidden p-14 text-[#f5f3f0]" style={{ background: 'linear-gradient(160deg,#2e1112 0%,#3a1516 55%,#4a1c1b 100%)' }}>
        <div className="lg-drift absolute rounded-full" style={{ width: 560, height: 560, left: -160, top: -180, background: 'radial-gradient(circle,rgba(168,66,63,.55),transparent 65%)' }} />
        <div className="lg-drift-r absolute rounded-full" style={{ width: 480, height: 480, right: -120, bottom: -140, background: 'radial-gradient(circle,rgba(233,163,32,.22),transparent 65%)' }} />
        <svg className="lg-stitch absolute inset-0 w-full h-full opacity-55" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {STITCHES.map(([d, c, k]) => <path key={d} d={d} className={k} fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" />)}
        </svg>
        <div className="relative">
          <h1 className="lg-hero font-serif font-semibold text-[clamp(30px,3.4vw,46px)] leading-[1.1] max-w-[470px] m-0">Procurement, vendors and orders in one place.</h1>
          <p className="lg-hero mt-3.5 mb-0 max-w-[420px] text-[#d9a79f]">Admin panel for the Shinde footwear team.</p>
          <div className="lg-hero mt-7 flex items-baseline gap-3 text-[#d9a79f]" aria-hidden="true">
            <span>Manage</span>
            <span className="relative inline-block w-60 h-[30px] font-serif text-2xl font-semibold text-[#f1b73a]">
              {WORDS.map((w, i) => <span key={w} className="lg-word" style={{ animationDelay: `${i * 3}s` }}>{w}</span>)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex overflow-y-auto min-h-0 p-6 bg-bg relative">
        <button type="button" className="btn btn-sm absolute top-4 right-4" onClick={toggle}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
        <motion.form key={shake} onSubmit={submit} noValidate
          initial={shake ? { x: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
          animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: shake ? 0.4 : 0.6, ease: 'easeOut' }}
          className="card w-full max-w-[400px] my-auto mx-auto px-8 py-7 grid gap-3.5" style={{ boxShadow: '0 18px 50px rgba(58,21,22,.14)' }}>
          <div className="lg-logo flex justify-center">
            <div className="bg-white rounded-xl px-3.5 py-1"><img src="/logo.jpg" alt="Shinde Shoes" width="190" className="block h-auto" style={{ width: 190 }} /></div>
          </div>
          <div className="lg-field text-center">
            <h2 className="font-serif font-semibold text-[26px] m-0 mb-0.5">Welcome back</h2>
            <div className="text-muted">Sign in with your staff account.</div>
          </div>
          <label className="lg-field block">
            <span className="label !text-ink">Username</span>
            <input className="input !h-[42px] !rounded-lg" autoFocus autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} />
          </label>
          <label className="lg-field block">
            <span className="label !text-ink">Password</span>
            <div className="flex gap-2">
              <input className="input !h-[42px] !rounded-lg" type={show ? 'text' : 'password'} autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} />
              <button type="button" className="btn !h-[42px] !rounded-lg" onClick={() => setShow(!show)} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          <AnimatePresence initial={false}>
            {err && <motion.div key="e" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-bad text-sm overflow-hidden">{err}</motion.div>}
          </AnimatePresence>
          <button className="lg-field btn btn-primary relative overflow-hidden !h-11 !rounded-lg !font-semibold hover:-translate-y-px" disabled={busy}>
            <span className="lg-sheen absolute top-0 bottom-0 w-2/5 pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent)' }} />
            <span className="relative flex items-center gap-2">
              {busy && <span className="lg-spin inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white" />}
              {busy ? 'Signing in' : 'Sign in'}
            </span>
          </button>
          <div className="lg-field text-xs text-muted text-center">Accounts are created by an Administrator.</div>
        </motion.form>
      </div>
    </div>
  );
}
