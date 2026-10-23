// Browser-only audit trail: every successful write the panel sends is recorded here.
// The backend has no audit endpoint yet, so this is the Audit Logs screen's data source.
const KEY = 'shinde_admin_audit';

export function readAudit() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
export function pushAudit(entry) {
  const list = [entry, ...readAudit()].slice(0, 500);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full */ }
}
export function clearAudit() { localStorage.removeItem(KEY); }
