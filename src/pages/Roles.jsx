import { useEffect, useMemo, useState } from 'react';
import { rolesApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { isAdminRole, useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Can, ErrorState, PageHeader, Pill, Spinner } from '../components/ui';

const roleName = (r) => String(r.role_name ?? r.name ?? r.role ?? `Role ${r.role_id ?? r.id}`);
const roleId = (r) => r.role_id ?? r.id;

// Module names in the permission table that are worded differently on screen.
const MODULE_LABEL = { vendor: 'supplier' };

export default function Roles() {
  const toast = useToast();
  const { user, perms, refreshPermissions } = useAuth();
  const roles = useAsync(() => rolesApi.list());
  const all = useAsync(() => rolesApi.allPermissions());
  const [sel, setSel] = useState(null);
  const granted = useAsync(() => rolesApi.permissionsOf(sel), [sel], { enabled: !!sel });
  const [checked, setChecked] = useState(new Set());
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (roles.data?.length && !sel) setSel(roleId(roles.data[0])); }, [roles.data, sel]);
  useEffect(() => { if (granted.data) { setChecked(new Set(granted.data.map((p) => p.permission_id))); setDirty(false); } }, [granted.data]);

  const role = (roles.data || []).find((r) => roleId(r) === sel);
  const locked = role && isAdminRole(roleName(role));

  const { modules, actions, byKey } = useMemo(() => {
    const list = all.data || [];
    const m = [...new Set(list.map((p) => p.module))].filter((x) => x !== 'pattern'); // patterns are not used on screen any more
    const a = [...new Set(list.map((p) => p.action))];
    const k = {};
    list.forEach((p) => { k[`${p.module}|${p.action}`] = p; });
    return { modules: m, actions: a, byKey: k };
  }, [all.data]);

  const toggle = (id) => { setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); setDirty(true); };

  async function save() {
    setBusy(true);
    try {
      await rolesApi.save(sel, [...checked]);
      toast.success(`${roleName(role)} saved.`);
      setDirty(false);
      if (roleName(role).toLowerCase() === String(user.role).toLowerCase()) await refreshPermissions();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  if (roles.loading || all.loading) return <Spinner />;
  if (roles.error || all.error) return <ErrorState error={roles.error || all.error} onRetry={() => { roles.reload(); all.reload(); }} />;

  return (
    <>
      <PageHeader title="Roles & Permissions" sub="Choose what each role can do. Saving replaces the whole list for that role."
        actions={<Can perm="role.edit"><button className="btn btn-primary" disabled={!dirty || busy || locked} onClick={save}>{busy ? 'Saving…' : 'Save permissions'}</button></Can>} />

      <div className="card p-4 mb-4">
        <div className="font-medium mb-1">Your session</div>
        <div className="text-muted text-xs mb-2">{user.username} · role <b>{user.role}</b> · {perms.all ? 'full access' : `${perms.keys.length} permission keys`}{perms.note ? ` · ${perms.note}` : ''}</div>
        {!perms.all && <div className="flex flex-wrap gap-1">{perms.keys.map((k) => <Pill key={k}>{k}</Pill>)}</div>}
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_1fr] items-start">
        <div className="card p-2" role="listbox" aria-label="Roles">
          {(roles.data || []).map((r) => (
            <button key={roleId(r)} role="option" aria-selected={roleId(r) === sel} onClick={() => { if (!dirty || window.confirm('Discard unsaved changes?')) setSel(roleId(r)); }}
              className="w-full text-left px-3 py-2 rounded-md" style={roleId(r) === sel ? { background: 'var(--primary-bg)', color: 'var(--primary-fg)', fontWeight: 600 } : {}}>
              {roleName(r)}{isAdminRole(roleName(r)) && <span className="text-xs text-muted"> · locked</span>}
            </button>
          ))}
          {!roles.data?.length && <div className="p-3 text-muted">No roles in the role table.</div>}
        </div>

        <div className="card overflow-x-auto">
          {locked && <div className="px-4 py-2 text-xs" style={{ background: 'var(--info-bg)', color: 'var(--info-fg)' }}>The Administrator role is locked and always has every permission.</div>}
          {granted.loading ? <Spinner /> : (
            <table className="w-full border-collapse">
              <thead><tr><th className="th">Module</th>{actions.map((a) => <th key={a} className="th text-center capitalize">{a}</th>)}</tr></thead>
              <tbody>{modules.map((m) => (
                <tr key={m}>
                  <td className="td font-medium">{MODULE_LABEL[m] || m}</td>
                  {actions.map((a) => {
                    const p = byKey[`${m}|${a}`];
                    return (
                      <td key={a} className="td text-center">
                        {p ? <input type="checkbox" aria-label={`${m} ${a}`} title={p.permission_key} disabled={locked} checked={locked || checked.has(p.permission_id)} onChange={() => toggle(p.permission_id)} /> : <span className="text-muted">-</span>}
                      </td>
                    );
                  })}
                </tr>))}</tbody>
            </table>
          )}
          {!modules.length && <div className="p-6 text-muted">The permission table is empty.</div>}
        </div>
      </div>
    </>
  );
}
