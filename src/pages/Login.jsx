import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../context/AuthContext';
import { Field } from '../components/ui';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const hero = useRef(null);
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-item', { opacity: 0, y: 18, duration: 0.6, stagger: 0.12, ease: 'power2.out' });
    }, hero);
    return () => ctx.revert();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!u.trim() || !p) { setErr('Enter your username and password.'); return; }
    setBusy(true); setErr('');
    try { await login(u.trim(), p); nav(loc.state?.from || '/', { replace: true }); }
    catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="h-full grid md:grid-cols-[1.1fr_1fr]">
      <div ref={hero} className="hidden md:flex flex-col justify-end p-12 bg-side text-white">
        <div className="hero-item w-12 h-12 rounded-md bg-[#8a3230] flex items-center justify-center text-xl font-semibold mb-6">S</div>
        <h1 className="hero-item font-serif text-5xl leading-tight m-0 mb-3">Shinde<br />Procurement</h1>
        <p className="hero-item text-[#a79d98] max-w-sm m-0">Vendors, products, purchase orders and access, in one place.</p>
      </div>
      <div className="flex items-center justify-center p-6 bg-bg">
        <form onSubmit={submit} className="card p-8 w-full max-w-sm" noValidate>
          <h2 className="font-serif text-2xl m-0 mb-1">Sign in</h2>
          <p className="text-muted mt-0 mb-5">Accounts are created by an Administrator.</p>
          <Field label="Username" required><input className="input" autoFocus autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} /></Field>
          <Field label="Password" required>
            <div className="flex gap-2">
              <input className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} />
              <button type="button" className="btn" onClick={() => setShow(!show)} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>
            </div>
          </Field>
          {err && <div role="alert" className="text-bad text-sm mb-3">{err}</div>}
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <button type="button" className="btn btn-sm mt-4" onClick={toggle}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
        </form>
      </div>
    </div>
  );
}
