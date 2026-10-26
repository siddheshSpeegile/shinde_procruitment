import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { MASTERS, masterApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useForm } from '../hooks/useForm';
import { useToast } from '../context/ToastContext';
import { Can, Confirm, DataTable, Drawer, Field, MockBanner, Modal, PageHeader, StatusPill, Swatch } from '../components/ui';
import { isHex } from '../lib/validate';

function MasterForm({ type, row, onDone, onClose }) {
  const M = MASTERS[type];
  const toast = useToast();
  const api = masterApi(type);
  const f = useForm({ name: row?.[M.nameKey] ?? '', hex: row?.hex_code || '#8a3230', hasHex: !!row?.hex_code, description: row?.description ?? '' }, (v) => {
    const e = {};
    const name = String(v.name).trim();
    if (!name) e.name = `${M.isGst ? 'Percentage' : M.label} is required.`;
    if ((M.nameKey === 'size_value') && !/^\d+$/.test(name)) e.name = 'Enter a whole number, e.g. 8.';
    if (M.isGst && (isNaN(Number(name)) || Number(name) < 0 || Number(name) > 100)) e.name = 'Enter a percentage between 0 and 100.';
    if (M.hasHex && v.hasHex && !isHex(v.hex)) e.hex = 'Hex must look like #8A3230.';
    return e;
  });

  const save = f.submit(async (v) => {
    const body = { [M.nameKey]: M.isGst ? Number(v.name) : String(v.name).trim() };
    if (M.hasHex) body.hex_code = v.hasHex ? v.hex : '';
    if (M.isGst) body.description = v.description;
    try {
      row ? await api.update(row[M.idKey], body) : await api.create(body);
      toast.success(`${M.label} ${row ? 'updated' : 'added'}.`);
      onDone();
    } catch (e) { toast.error(e.message); }
  });

  return (
    <Drawer open title={`${row ? 'Edit' : 'Add'} ${M.label.toLowerCase()}`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="master-form" disabled={f.busy}>{f.busy ? 'Saving…' : 'Save'}</button></>}>
      <form id="master-form" onSubmit={save} noValidate>
        <Field label={M.isGst ? 'Percentage' : M.nameKey === 'size_value' ? 'Size number' : 'Name'} required error={f.errors.name}>
          <input className="input" autoFocus {...f.bind('name')} inputMode={M.isGst || M.nameKey === 'size_value' ? 'decimal' : undefined} />
        </Field>
        {M.isGst && <Field label="Description"><input className="input" {...f.bind('description')} /></Field>}
        {M.hasHex && (
          <>
            <label className="flex items-center gap-2 mb-2"><input type="checkbox" checked={f.values.hasHex} onChange={(e) => f.set('hasHex', e.target.checked)} /> Set a swatch colour</label>
            {f.values.hasHex && (
              <Field label="Hex colour" error={f.errors.hex}>
                <div className="flex gap-2 items-center">
                  <input type="color" aria-label="Pick colour" value={isHex(f.values.hex) ? f.values.hex : '#000000'} onChange={(e) => f.set('hex', e.target.value)} />
                  <input className="input" {...f.bind('hex')} />
                </div>
              </Field>
            )}
          </>
        )}
      </form>
    </Drawer>
  );
}

function MasterList({ type }) {
  const M = MASTERS[type];
  const api = masterApi(type);
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.list(), [type]);
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [usage, setUsage] = useState(null);

  const label = (r) => (M.isGst ? `${Number(r.gst_rate)}%` : r[M.nameKey]);
  const rows = (data || []).map((r) => ({ ...r, __key: r[M.idKey] }));

  async function toggle() {
    const r = confirm;
    try {
      await api.setStatus(r[M.idKey], r.status === 'active' ? 'inactive' : 'active');
      toast.success(`${label(r)} is now ${r.status === 'active' ? 'inactive' : 'active'}.`);
      setConfirm(null); reload();
    } catch (e) { toast.error(e.message); }
  }
  async function showUsage(r) {
    try { setUsage({ r, count: (await api.usage(r[M.idKey])).usage_count }); } catch (e) { toast.error(e.message); }
  }

  const cols = [{ header: M.nameKey === 'size_value' ? 'Size' : M.isGst ? 'Rate' : 'Name', render: (r) => <span className="font-medium">{label(r)}</span> }];
  if (M.hasHex) cols.push({ header: 'Swatch', render: (r) => <span className="flex items-center gap-2"><Swatch hex={r.hex_code} /><span className="font-mono text-xs">{r.hex_code || '-'}</span></span> });
  if (M.isGst) cols.push({ header: 'Description', key: 'description' });
  cols.push({ header: 'Status', render: (r) => <StatusPill value={r.status} /> });
  cols.push({ header: '', className: 'text-right', render: (r) => (
    <div className="flex gap-1.5 justify-end">
      <Can perm={`${M.perm}.edit`}><button className="btn btn-sm" onClick={() => setEdit(r)}>Edit</button></Can>
      {M.isGst && <button className="btn btn-sm" onClick={() => showUsage(r)}>Usage</button>}
      <Can perm={M.isGst ? 'gst.edit' : `${M.perm}.activate`}><button className="btn btn-sm" onClick={() => setConfirm(r)}>{r.status === 'active' ? 'Deactivate' : 'Activate'}</button></Can>
    </div>) });

  return (
    <>
      <PageHeader title={M.plural}
        actions={<Can perm={`${M.perm}.create`}><button className="btn btn-primary" onClick={() => setEdit({})}>Add {M.label.toLowerCase()}</button></Can>} />
      {type === 'sizes' && <MockBanner>A size you deactivate disappears from this list and cannot be switched back on from here.</MockBanner>}
      <DataTable rows={rows} loading={loading} error={error} onRetry={reload} columns={cols} emptyTitle={`No ${M.plural.toLowerCase()} yet`}
        searchText={(r) => String(label(r)) + ' ' + (r.description || '')} />
      {edit && <MasterForm type={type} row={edit[M.idKey] ? edit : null} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); }} />}
      <Confirm open={!!confirm} danger={confirm?.status === 'active'} title={confirm?.status === 'active' ? 'Deactivate' : 'Activate'}
        body={confirm && `${label(confirm)} will be ${confirm.status === 'active' ? 'hidden from new selections. Existing products and orders keep it' : 'available again'}.`}
        confirmLabel={confirm?.status === 'active' ? 'Deactivate' : 'Activate'} onConfirm={toggle} onClose={() => setConfirm(null)} />
      <Modal open={!!usage} title="GST usage" onClose={() => setUsage(null)} footer={<button className="btn" onClick={() => setUsage(null)}>Close</button>}>
        {usage && <>Rate <b>{Number(usage.r.gst_rate)}%</b> is used on <b>{usage.count}</b> order line{usage.count === 1 ? '' : 's'}.</>}
      </Modal>
    </>
  );
}

export default function Masters() {
  const type = useLocation().pathname.split('/').pop();
  return MASTERS[type] ? <MasterList key={type} type={type} /> : <Navigate to="/" replace />;
}
