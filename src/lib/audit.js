// Browser-only audit trail: every successful write the panel sends is recorded here.
// The backend has no audit endpoint yet, so this is the Audit Logs screen's data source.
const KEY = 'shinde_admin_audit';

// Never keep passwords (or similar secrets) in the log.
const SECRET = /pass(word)?|secret|token/i;
export function redact(v) {
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET.test(k) ? '********' : redact(x)]));
  return v;
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full */ }
}

// Entries saved by older versions may contain a typed password: clean them as soon as the app loads.
(function cleanOldEntries() {
  const list = load();
  if (!list.length) return;
  const clean = list.map((e) => ({ ...e, body: redact(e.body) }));
  if (JSON.stringify(clean) !== JSON.stringify(list)) save(clean);
}());

export function readAudit() { return load(); }
export function pushAudit(entry) {
  save([{ ...entry, body: redact(entry.body) }, ...load()].slice(0, 500));
}
export function clearAudit() { localStorage.removeItem(KEY); }
