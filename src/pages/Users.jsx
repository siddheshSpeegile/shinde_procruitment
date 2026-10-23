import { useState } from 'react';
import { rolesApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useForm } from '../hooks/useForm';
import { useToast } from '../context/ToastContext';
import { MOCK_USERS } from '../config';
import { Can, DataTable, Drawer, Field, MockBanner, PageHeader, StatusPill } from '../components/ui';
import { isMobile } from '../lib/validate';
import { fmtDateTime } from '../lib/format';

// MOCK: the backend has no user-management endpoints. Data lives in this browser only.
const KEY = 'shinde_mock_users';
const SEED = [
  { id: 1, name: 'Anil Shinde', username: 'anil', role: 'Administrator', mobile: '9820000001', status: 'active', last: null },
  { id: 2, name: 'Sneha Kulkarni', username: 'sneha', role: 'Procurement Manager', mobile: '9820000002', status: 'active', last: null },
];
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || SEED; } catch { return SEED; } };

function UserForm({ user, roles, onSave, onClose }) {
  const f = useForm({ name: user?.name ?? '', username: user?.username ?? '', role: user?.role ?? roles[0] ?? '', mobile: user?.mobile ?? '' }, (v) => {
    const e = {};
    if (!v.name.trim()) e.name = 'Name is required.';
    if (!v.username.trim()) e.username = 'Username is required.';
    if (v.mobile && !isMobile(v.mobile)) e.mobile = 'Enter a 10 digit mobile number.';
    return e;
  });
  const save = f.submit(async (v) => onSave(v));
  return (
    <Drawer open title={user ? 'Edit user' : 'Add user'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="user-form">Save</button></>}>
      <form id="user-form" onSubmit={save} noValidate>
        <Field label="Full name" required error={f.errors.name}><input className="input" {...f.bind('name')} /></Field>
        <Field label="Username" required error={f.errors.username}><input className="input" {...f.bind('username')} /></Field>
        <Field label="Role"><select className="input" {...f.bind('role')}>{roles.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Mobile" error={f.errors.mobile}><input className="input" inputMode="numeric" maxLength={10} {...f.bind('mobile')} /></Field>
      </form>
    </Drawer>
  );
}

export default function Users() {
  const toast = useToast();
  const roles = useAsync(() => rolesApi.list());
  const [rows, setRows] = useState(read);
  const [edit, setEdit] = useState(null);
  const roleNames = (roles.data || []).map((r) => String(r.role_name ?? r.name ?? r.role));
  const persist = (n) => { setRows(n); localStorage.setItem(KEY, JSON.stringify(n)); };

  if (!MOCK_USERS) return <><PageHeader title="Users" /><div className="card p-10 text-center text-muted">User management needs backend endpoints that do not exist yet. Set VITE_MOCK_USERS=true to preview the screen.</div></>;

  return (
    <>
      <PageHeader title="Users" sub="Staff accounts and roles" actions={<Can perm="user.create"><button className="btn btn-primary" onClick={() => setEdit({})}>Add user</button></Can>} />
      <MockBanner>No user endpoints exist on the backend (only POST /auth/login and /auth/register). These rows are stored in this browser only and do not create real logins.</MockBanner>
      <DataTable rows={rows.map((u) => ({ ...u, __key: u.id }))} searchText={(u) => `${u.name} ${u.username} ${u.role}`}
        columns={[
          { header: 'Name', render: (u) => <span className="font-medium">{u.name}</span> },
          { header: 'Username', render: (u) => <span className="font-mono">{u.username}</span> },
          { header: 'Role', key: 'role' }, { header: 'Mobile', key: 'mobile' },
          { header: 'Status', render: (u) => <StatusPill value={u.status} /> },
          { header: 'Last sign-in', render: (u) => fmtDateTime(u.last) },
          { header: '', className: 'text-right', render: (u) => (
            <div className="flex gap-1.5 justify-end">
              <Can perm="user.edit"><button className="btn btn-sm" onClick={() => setEdit(u)}>Edit</button></Can>
              <Can perm="user.activate"><button className="btn btn-sm" onClick={() => { persist(rows.map((x) => (x.id === u.id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x))); toast.success('Status changed (mock).'); }}>{u.status === 'active' ? 'Deactivate' : 'Activate'}</button></Can>
            </div>) },
        ]} />
      {edit && <UserForm user={edit.id ? edit : null} roles={roleNames} onClose={() => setEdit(null)}
        onSave={(v) => {
          if (rows.some((x) => x.username.toLowerCase() === v.username.trim().toLowerCase() && x.id !== edit.id)) { toast.error('That username is taken.'); return; }
          persist(edit.id ? rows.map((x) => (x.id === edit.id ? { ...x, ...v } : x)) : [{ ...v, id: Date.now(), status: 'active', last: null }, ...rows]);
          toast.success('Saved (mock).'); setEdit(null);
        }} />}
    </>
  );
}
