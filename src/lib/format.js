// Flask serialises Decimal as a string and dates as "Thu, 08 Oct 2026 00:00:00 GMT". Normalise here.
export const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
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

export const variantLabel = (v) => [v.color_name, v.pattern_name, v.category_name].filter(Boolean).join(' · ') || `Variant #${v.variant_id}`;

export function downloadCsv(filename, rows) {
  const esc = (c) => `"${String(c ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
