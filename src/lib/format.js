// Flask serialises Decimal as a string and dates as "Thu, 08 Oct 2026 00:00:00 GMT". Normalise here.
export const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
// Money with always two decimals (payment amounts).
export const inr2 = (v) => '₹' + num(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const inr = (v) => '₹' + num(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export function fmtDate(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(v) {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function isoDate(v) {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}
export const today = () => new Date().toISOString().slice(0, 10);

export const variantLabel = (v) => [v.color_name, v.category_name].filter(Boolean).join(' · ') || `Variant #${v.variant_id}`;

export function downloadCsv(filename, rows) {
  const esc = (c) => `"${String(c ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** "Just now", "5 min ago", "3 h ago", "2 days ago", then the date. */
export function timeAgo(v) {
  const d = new Date(v);
  if (!v || isNaN(d)) return '';
  const s = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) { const n = Math.floor(s / 86400); return `${n} day${n === 1 ? '' : 's'} ago`; }
  return fmtDateTime(v);
}
