import { useState } from 'react';
import { rolesApi, usersApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useForm } from '../hooks/useForm';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Can, Confirm, DataTable, Drawer, Field, Modal, PageHeader, StatusPill } from '../components/ui';
import { isEmail, isMobile } from '../lib/validate';
import { fmtDate } from '../lib/format';

const MIN_PASSWORD = 8;

// 12 characters with a capital, a small letter, a number and a symbol; no look-alike characters (0/O, 1/l/I).
function generatePassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '@#$%&*!?'];
  const all = sets.join('');
  const pick = (chars) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  const out = sets.map(pick);
  while (out.length < 12) out.push(pick(all));
  for (let i = out.length - 1; i > 0; i -= 1) { // shuffle
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}

const passwordError = (pw, username) => {
  if (!pw || pw.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  if (username && pw.toLowerCase() === username.toLowerCase()) return 'Password must not be the same as the username.';
  return '';
};

/** Password box with Show/Hide and Generate. */
function PasswordFields({ f, error, confirmError }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Field label="Password" required error={error} hint={`At least ${MIN_PASSWORD} characters. Give it to the user once you save.`}>
        <div className="flex gap-2">
          <input className="input" type={show ? 'text' : 'password'} autoComplete="new-password" {...f.bind('password')} />
          <button type="button" className="btn" onClick={() => setShow(!show)} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>
          <button type="button" className="btn" onClick={() => { const p = generatePassword(); f.set('password', p); f.set('confirm', p); setShow(true); }}>Generate</button>
        </div>
      </Field>
      <Field label="Confirm password" required error={confirmError}>
        <input className="input" type={show ? 'text' : 'password'} autoComplete="new-password" {...f.bind('confirm')} />
      </Field>
    </>
  );
}

function UserForm({ user, roles, onSave, onClose }) {
  const f = useForm({
    full_name: user?.full_name ?? '', username: user?.username ?? '', email: user?.email ?? '',
    role_id: String(user?.role_id ?? ''), // new users must be given a role on purpose mobile_number: user?.mobile_number ?? '',
    password: '', confirm: '',
  }, (v) => {
    const e = {};
    if (!v.full_name.trim()) e.full_name = 'Name is required.';
    if (!user) {
      if (!/^[A-Za-z0-9._-]{3,30}$/.test(v.username.trim())) e.username = 'Use 3 to 30 letters, numbers, dot, dash or underscore.';
      const pe = passwordError(v.password, v.username.trim());
      if (pe) e.password = pe;
      else if (v.password !== v.confirm) e.confirm = 'The two passwords do not match.';
    }
    if (!isEmail(v.email.trim())) e.email = 'Enter a valid email address.';
    if (!v.role_id) e.role_id = 'Choose a role.';
    if (v.mobile_number && !isMobile(v.mobile_number)) e.mobile_number = 'Enter a 10 digit mobile number.';
    return e;
  });
  const save = f.submit(async (v) => onSave(v));
  return (
    <Drawer open title={user ? 'Edit user' : 'Add user'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="user-form" disabled={f.busy}>{f.busy ? 'Saving…' : 'Save'}</button></>}>
      <form id="user-form" onSubmit={save} noValidate>
        <Field label="Full name" required error={f.errors.full_name}><input className="input" {...f.bind('full_name')} /></Field>
        <Field label="Username" required error={f.errors.username} hint={user ? 'The username cannot be changed.' : 'The user signs in with this.'}>
          <input className="input" autoComplete="off" disabled={!!user} {...f.bind('username')} />
        </Field>
        <Field label="Email" required error={f.errors.email}><input className="input" type="email" {...f.bind('email')} /></Field>
        <Field label="Role" required error={f.errors.role_id}>
          <select className="input" {...f.bind('role_id')}>
            <option value="">Choose a role</option>
            {roles.map((r) => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
          </select>
        </Field>
        <Field label="Mobile" error={f.errors.mobile_number}><input className="input" inputMode="numeric" maxLength={10} {...f.bind('mobile_number')} /></Field>
        {!user && <PasswordFields f={f} error={f.errors.password} confirmError={f.errors.confirm} />}
        {user && <div className="text-xs text-muted">To change this user's password, close this and use <b>Reset password</b>.</div>}
      </form>
    </Drawer>
  );
}

/** Reset someone's password. */
function ResetDialog({ user, onDone, onClose }) {
  const f = useForm({ password: '', confirm: '' }, (v) => {
    const e = {};
    const pe = passwordError(v.password, user.username);
    if (pe) e.password = pe; else if (v.password !== v.confirm) e.confirm = 'The two passwords do not match.';
    return e;
  });
  const save = f.submit(async (v) => onDone(v.password));
  return (
    <Modal open title={`Reset password · ${user.username}`} onClose={onClose} width={480}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="reset-form" disabled={f.busy}>{f.busy ? 'Saving…' : 'Reset password'}</button></>}>
      <form id="reset-form" onSubmit={save} noValidate>
        <p className="text-muted mt-0">The old password stops working immediately. Give the new one to {user.full_name || user.username}.</p>
        <PasswordFields f={f} error={f.errors.password} confirmError={f.errors.confirm} />
      </form>
    </Modal>
  );
}

/** Shown once after creating a user or resetting a password, so the admin can pass the details on. */
function CredentialsDialog({ info, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = `Username: ${info.username}\nPassword: ${info.password}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: the text is on screen */ }
  };
  return (
    <Modal open title={info.title} onClose={onClose} width={460}
      footer={<><button className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button><button className="btn btn-primary" onClick={onClose}>Done</button></>}>
      <p className="text-muted mt-0">Give these details to {info.name}. For safety the password is shown only now and cannot be looked up again. You can reset it later.</p>
      <div className="card p-3 font-mono text-[13px] whitespace-pre-wrap break-all" style={{ background: 'var(--surface2)' }}>{text}</div>
    </Modal>
  );
}

export default function Users() {
  const toast = useToast();
  const { user: me } = useAuth();
  const users = useAsync(() => usersApi.list());
  const rolesState = useAsync(() => rolesApi.list());
  const roles = (rolesState.data || []).filter((r) => !r.status || r.status === 'active');
  const [edit, setEdit] = useState(null);
  const [reset, setReset] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [creds, setCreds] = useState(null);

  const rows = (users.data || []).map((u) => ({ ...u, __key: u.user_id }));

  async function saveUser(v) {
    try {
      if (edit.user_id) {
        await usersApi.update(edit.user_id, { full_name: v.full_name.trim(), email: v.email.trim(), mobile_number: v.mobile_number.trim(), role_id: Number(v.role_id) });
        toast.success('User updated.');
      } else {
        await usersApi.create({ full_name: v.full_name.trim(), username: v.username.trim(), email: v.email.trim(), mobile_number: v.mobile_number.trim(), role_id: Number(v.role_id), password: v.password });
        setCreds({ title: 'User created', name: v.full_name.trim(), username: v.username.trim(), password: v.password });
      }
      setEdit(null); users.reload();
    } catch (e) { toast.error(e.message); }
  }

  async function doReset(password) {
    try {
      await usersApi.resetPassword(reset.user_id, password);
      setCreds({ title: 'Password reset', name: reset.full_name || reset.username, username: reset.username, password });
      setReset(null);
    } catch (e) { toast.error(e.message); }
  }

  async function toggle() {
    const u = confirm;
    const next = u.status === 'active' ? 'inactive' : 'active';
    try {
      await usersApi.setStatus(u.user_id, next);
      toast.success(`${u.username} is now ${next}.`);
      setConfirm(null); users.reload();
    } catch (e) { toast.error(e.message); setConfirm(null); }
  }

  return (
    <>
      <PageHeader title="Users" sub="Staff accounts and roles. Users sign in with the username and password you set here."
        actions={<Can perm="user.create"><button className="btn btn-primary" disabled={!roles.length} onClick={() => setEdit({})}>Add user</button></Can>} />
      <DataTable rows={rows} loading={users.loading} error={users.error} onRetry={users.reload} emptyTitle="No users yet"
        searchText={(u) => `${u.full_name || ''} ${u.username} ${u.email} ${u.role_name || ''} ${u.mobile_number || ''}`}
        columns={[
          { header: 'User', render: (u) => <div><div className="font-medium">{u.full_name || u.username}</div><div className="font-mono text-xs text-muted">{u.username}</div></div> },
          { header: 'Email', key: 'email' },
          { header: 'Mobile', render: (u) => u.mobile_number || '-' },
          { header: 'Role', render: (u) => u.role_name || '-' },
          { header: 'Status', render: (u) => <StatusPill value={u.status} /> },
          { header: 'Created', render: (u) => fmtDate(u.created_date) },
          { header: '', className: 'text-right whitespace-nowrap', render: (u) => (
            <div className="flex gap-1.5 justify-end">
              <Can perm="user.edit"><button className="btn btn-sm" onClick={() => setEdit(u)}>Edit</button></Can>
              <Can perm="user.reset_password"><button className="btn btn-sm" onClick={() => setReset(u)}>Reset password</button></Can>
              {u.user_id !== me?.user_id && (
                <Can perm="user.activate"><button className="btn btn-sm" onClick={() => setConfirm(u)}>{u.status === 'active' ? 'Deactivate' : 'Activate'}</button></Can>
              )}
            </div>) },
        ]} />

      {edit && <UserForm user={edit.user_id ? edit : null} roles={roles} onClose={() => setEdit(null)} onSave={saveUser} />}
      {reset && <ResetDialog user={reset} onClose={() => setReset(null)} onDone={doReset} />}
      {creds && <CredentialsDialog info={creds} onClose={() => setCreds(null)} />}
      <Confirm open={!!confirm} danger={confirm?.status === 'active'} title={confirm?.status === 'active' ? 'Deactivate user' : 'Activate user'}
        body={confirm?.status === 'active' ? `${confirm?.username} will no longer be able to sign in.` : `${confirm?.username} will be able to sign in again.`}
        confirmLabel={confirm?.status === 'active' ? 'Deactivate' : 'Activate'} onConfirm={toggle} onClose={() => setConfirm(null)} />
    </>
  );
}
