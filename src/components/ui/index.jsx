import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { resolveImage } from '../../config';
import { api } from '../../api/client';

export const Can = ({ perm, children, fallback = null }) => (useAuth().can(perm) ? children : fallback);

export const Pill = ({ tone = 'neutral', children }) => <span className={`pill pill-${tone}`}>{children}</span>;
const TONES = { active: 'ok', delivered: 'ok', paid: 'ok', inactive: 'neutral', confirmed: 'info', draft: 'warn', unpaid: 'warn', delayed: 'bad', pending: 'info', pending_approval: 'warn', rejected: 'bad', awaiting_approval: 'warn' };
export const StatusPill = ({ value }) => <Pill tone={TONES[value] || 'neutral'}>{String(value ?? '-').replace('_', ' ')}</Pill>;

// Back button for sub-pages. Goes to `to`; with useHistory it returns to the page the user came from
// (only when that page is inside this app), otherwise it falls back to `to`.
export function BackButton({ to, label = 'Back', useHistory }) {
  const nav = useNavigate();
  const go = () => (useHistory && window.history.state?.idx > 0 ? nav(-1) : nav(to));
  return <button type="button" className="btn btn-sm" onClick={go}><span aria-hidden="true">&larr;</span> {label}</button>;
}

export function PageHeader({ title, sub, actions, back }) {
  return (
    <div className="mb-4 no-print">
      {back && <div className="mb-3"><BackButton {...back} /></div>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif font-semibold text-[24px] md:text-[28px] leading-tight m-0">{title}</h1>
          {sub && <div className="text-muted mt-0.5">{sub}</div>}
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  );
}

export const MockBanner = ({ children }) => (
  <div className="mb-4 rounded-md px-3 py-2 text-xs" style={{ background: 'var(--warn-bg)', color: 'var(--warn-fg)' }}>
    <b>MOCK.</b> {children}
  </div>
);

export const Spinner = () => <div className="p-8 text-center text-muted" role="status">Loading…</div>;

export const ErrorState = ({ error, onRetry }) => (
  <div className="p-8 text-center" role="alert">
    <div className="font-medium text-bad mb-1">Could not load this data</div>
    <div className="text-muted mb-3">{error?.message}</div>
    {onRetry && <button className="btn btn-sm" onClick={onRetry}>Try again</button>}
  </div>
);

export const EmptyState = ({ title, hint }) => (
  <div className="p-10 text-center">
    <div className="font-medium">{title}</div>
    {hint && <div className="text-muted mt-1">{hint}</div>}
  </div>
);

export function Field({ label, error, hint, required, children }) {
  return (
    <label className="block mb-3">
      <span className="label">{label}{required && ' *'}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
      {error && <span role="alert" className="block text-xs text-bad mt-1">{error}</span>}
    </label>
  );
}

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
}

export function Drawer({ open, title, onClose, children, footer, width = 480 }) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && <motion.div key="bd" className="fixed inset-0 z-40 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />}
      {open && (
        <motion.aside key="dr" role="dialog" aria-modal="true" aria-label={title}
          className="fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-surface shadow-2xl"
          style={{ width: `min(${width}px, 100vw)` }}
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.22 }}>
          <div className="flex items-center justify-between px-5 h-14 border-b border-line flex-none">
            <h2 className="font-serif text-xl m-0">{title}</h2>
            <button className="btn btn-sm" onClick={onClose} aria-label="Close">Close</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
          {footer && <div className="flex-none flex justify-end gap-2 px-5 py-3 border-t border-line">{footer}</div>}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export function Modal({ open, title, onClose, children, footer, width = 440 }) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="m" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} className="card p-5 w-full" style={{ maxWidth: width }}
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-xl m-0 mb-2">{title}</h2>
            <div className="mb-4">{children}</div>
            <div className="flex justify-end gap-2">{footer}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confirm({ open, title, body, confirmLabel = 'Confirm', danger, busy, onConfirm, onClose }) {
  return (
    <Modal open={open} title={title} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={onConfirm}>{confirmLabel}</button></>}>
      <div className="text-muted">{body}</div>
    </Modal>
  );
}

export function Thumb({ src, size = 40, round }) {
  const url = resolveImage(src);
  return url
    ? <img src={url} alt="" width={size} height={size} loading="lazy" className={`object-cover bg-surface2 border border-line ${round ? 'rounded-full' : 'rounded-md'}`} style={{ width: size, height: size }} />
    : <div className={`border border-line bg-surface2 ${round ? 'rounded-full' : 'rounded-md'}`} style={{ width: size, height: size }} aria-hidden="true" />;
}

export const Swatch = ({ hex }) => <span className="inline-block w-4 h-4 rounded-full border border-line align-middle" style={{ background: hex || 'transparent' }} title={hex || 'no colour'} />;

export function DataTable({ columns, rows, loading, error, onRetry, toolbar, searchText, emptyTitle = 'Nothing here yet', emptyHint, pageSize = 10 }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const list = rows || [];
  const filtered = useMemo(() => (q && searchText ? list.filter((r) => searchText(r).toLowerCase().includes(q.toLowerCase())) : list), [list, q, searchText]);
  useEffect(() => setPage(0), [q, rows]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-line no-print">
        {searchText && <input className="input max-w-[260px]" placeholder="Search" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />}
        {toolbar}
        <div className="ml-auto text-xs text-muted">{filtered.length} {filtered.length === 1 ? 'row' : 'rows'}</div>
      </div>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={onRetry} /> : filtered.length === 0 ? <EmptyState title={q ? 'No matches' : emptyTitle} hint={q ? 'Try a different search.' : emptyHint} /> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr>{columns.map((c) => <th key={c.header} className="th">{c.header}</th>)}</tr></thead>
            <tbody>
              {view.map((r, i) => (
                <tr key={r.__key ?? i} className="hover:bg-surface2">
                  {columns.map((c) => <td key={c.header} className={`td ${c.className || ''}`}>{c.render ? c.render(r) : r[c.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && pages > 1 && (
        <div className="flex items-center justify-end gap-2 p-3 no-print">
          <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="text-xs text-muted">Page {page + 1} of {pages}</span>
          <button className="btn btn-sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

export function useApiStatus() {
  const [s, setS] = useState('checking');
  useEffect(() => { api.get('/health').then(() => setS('online')).catch(() => setS('offline')); }, []);
  return s;
}
