// Size template: UK and EUR, each with Toddler and Adult (the server sends size_system, size_group and size_label).
export const SIZE_SYSTEMS = ['UK', 'EUR'];
export const SIZE_GROUPS = ['Toddler', 'Adult'];
const RANGES = { 'UK Toddler': [1, 5], 'UK Adult': [1, 18], 'EUR Toddler': [18, 30], 'EUR Adult': [31, 46] };

export const sizeLabel = (s) => s.size_label || s.size_value;
export const groupTitle = (s) => (s.size_system && s.size_group ? `${s.size_system} ${s.size_group}` : '');

/** Splits sizes (already in template order) into runs of the same system and category, for headings in tables. */
export function groupSizes(list) {
  const out = [];
  (list || []).forEach((s) => {
    const title = groupTitle(s);
    const last = out[out.length - 1];
    if (last && last.title === title) last.items.push(s); else out.push({ title, items: [s] });
  });
  return out;
}

/** Same rule as the server: error text, or '' when the size belongs to the template. */
export function sizeProblem(system, group, value) {
  const v = String(value || '').trim().toUpperCase();
  const [lo, hi] = RANGES[`${system} ${group}`] || [];
  if (!lo) return 'Choose UK or EUR, and Toddler or Adult.';
  if (system === 'UK' && group === 'Toddler' && /^(0|[1-9]|1[0-3])K$/.test(v)) return '';
  if (/^[1-9]\d*$/.test(v) && Number(v) >= lo && Number(v) <= hi) return '';
  return `${system} ${group} sizes are ${lo} to ${hi}${system === 'UK' && group === 'Toddler' ? ' or 0K to 13K' : ''}.`;
}
