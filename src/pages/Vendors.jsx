import { useState } from 'react';
import { vendorsApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useForm } from '../hooks/useForm';
import { useToast } from '../context/ToastContext';
import { Can, Confirm, DataTable, Drawer, Field, PageHeader, StatusPill, Thumb } from '../components/ui';
import { isEmail, isGst, isMobile, isPan } from '../lib/validate';

const BLANK = { vendor_name: '', vendor_short_name: '', vendor_code: '', contact_person: '', mobile_number: '', email: '', gst_number: '', pan_number: '', address: '', remarks: '' };

function VendorForm({ vendor, onDone, onClose }) {
  const toast = useToast();
  const [logo, setLogo] = useState(null);
  const f = useForm({ ...BLANK, ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, vendor?.[k] ?? ''])) }, (v) => {
    const e = {};
    if (!v.vendor_name.trim()) e.vendor_name = 'Vendor name is required.';
    if (v.mobile_number && !isMobile(v.mobile_number)) e.mobile_number = 'Enter a 10 digit mobile number.';
    if (v.email && !isEmail(v.email)) e.email = 'Enter a valid email address.';
    if (v.gst_number && !isGst(v.gst_number)) e.gst_number = 'GST number must be 15 characters, e.g. 27AABCV4821K1ZP.';
    if (v.pan_number && !isPan(v.pan_number)) e.pan_number = 'PAN must look like AABCV4821K.';
    return e;
  });

  const save = f.submit(async (v) => {
    try {
      const body = { ...v, gst_number: v.gst_number.toUpperCase(), pan_number: v.pan_number.toUpperCase() };
      let id = vendor?.vendor_id;
      if (id) await vendorsApi.update(id, body);
      else id = (await vendorsApi.create(body)).vendor_id;
      if (logo) await vendorsApi.uploadLogo(id, logo);
      toast.success(vendor ? 'Vendor updated.' : 'Vendor added.');
      onDone();
    } catch (e) { toast.error(e.message); }
  });

  const T = (k, label, extra = {}) => <Field label={label} error={f.errors[k]} required={extra.required} hint={extra.hint}><input className="input" {...f.bind(k)} {...extra.input} /></Field>;
  return (
    <Drawer open title={vendor ? 'Edit vendor' : 'Add vendor'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="vendor-form" disabled={f.busy}>{f.busy ? 'Saving…' : vendor ? 'Save changes' : 'Add vendor'}</button></>}>
      <form id="vendor-form" onSubmit={save} noValidate>
        {T('vendor_name', 'Vendor name', { required: true })}
        {T('vendor_short_name', 'Short name')}
        {T('vendor_code', 'Vendor code', { hint: 'Unique. Leave blank if the vendor has no code.' })}
        {T('contact_person', 'Contact person')}
        {T('mobile_number', 'Mobile', { input: { inputMode: 'numeric', maxLength: 10 } })}
        {T('email', 'Email')}
        {T('gst_number', 'GST number', { input: { maxLength: 15 } })}
        {T('pan_number', 'PAN number', { input: { maxLength: 10 } })}
        <Field label="Address"><textarea className="input" rows={2} {...f.bind('address')} /></Field>
        <Field label="Remarks"><textarea className="input" rows={2} {...f.bind('remarks')} /></Field>
        <Field label="Logo" hint="JPG or PNG, up to 10 MB. Stored in the database.">
          <input type="file" accept="image/jpeg,image/png" onChange={(e) => {
            const file = e.target.files[0];
            if (file && file.size > 10 * 1024 * 1024) { toast.error('Logo must be 10 MB or smaller.'); e.target.value = ''; return; }
            setLogo(file || null);
          }} />
        </Field>
      </form>
    </Drawer>
  );
}

export default function Vendors() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => vendorsApi.list());
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState('');

  const rows = (data || []).filter((v) => !filter || v.status === filter).map((v) => ({ ...v, __key: v.vendor_id }));

  async function toggle() {
    const v = confirm;
    try {
      await vendorsApi.setStatus(v.vendor_id, v.status === 'active' ? 'inactive' : 'active');
      toast.success(`${v.vendor_name} is now ${v.status === 'active' ? 'inactive' : 'active'}.`);
      setConfirm(null); reload();
    } catch (e) { toast.error(e.message); }
  }

  return (
    <>
      <PageHeader title="Vendors"
        actions={<Can perm="vendor.create"><button className="btn btn-primary" onClick={() => setEdit({})}>Add vendor</button></Can>} />
      <DataTable rows={rows} loading={loading} error={error} onRetry={reload} emptyTitle="No vendors yet" emptyHint="Add the first vendor to start building the catalogue."
        searchText={(v) => [v.vendor_name, v.vendor_code, v.contact_person, v.mobile_number, v.gst_number].join(' ')}
        toolbar={<select className="input max-w-[150px]" aria-label="Status" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>}
        columns={[
          { header: 'Logo', render: (v) => <Thumb src={v.logo_url} round /> },
          { header: 'Vendor', render: (v) => <div><div className="font-medium">{v.vendor_name}</div><div className="text-xs text-muted">{v.vendor_short_name}</div></div> },
          { header: 'Code', render: (v) => <span className="font-mono">{v.vendor_code || '-'}</span> },
          { header: 'Contact', key: 'contact_person' },
          { header: 'Mobile', key: 'mobile_number' },
          { header: 'GST', render: (v) => <span className="font-mono text-xs">{v.gst_number || '-'}</span> },
          { header: 'Status', render: (v) => <StatusPill value={v.status} /> },
          { header: '', className: 'text-right whitespace-nowrap', render: (v) => (
            <div className="flex gap-1.5 justify-end">
              <Can perm="vendor.edit"><button className="btn btn-sm" onClick={() => setEdit(v)}>Edit</button></Can>
              <Can perm="vendor.activate"><button className="btn btn-sm" onClick={() => setConfirm(v)}>{v.status === 'active' ? 'Deactivate' : 'Activate'}</button></Can>
            </div>) },
        ]} />
      {edit && <VendorForm vendor={edit.vendor_id ? edit : null} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); }} />}
      <Confirm open={!!confirm} danger={confirm?.status === 'active'} title={confirm?.status === 'active' ? 'Deactivate vendor' : 'Activate vendor'}
        body={confirm?.status === 'active' ? `${confirm?.vendor_name} will stay on past orders but can no longer be chosen for new ones.` : `${confirm?.vendor_name} will be available again.`}
        confirmLabel={confirm?.status === 'active' ? 'Deactivate' : 'Activate'} onConfirm={toggle} onClose={() => setConfirm(null)} />
    </>
  );
}
