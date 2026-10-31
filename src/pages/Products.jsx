import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { masterApi, productsApi, subCategoriesApi, suggestionsApi, vendorsApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useForm } from '../hooks/useForm';
import { useToast } from '../context/ToastContext';
import { Can, Confirm, DataTable, Drawer, Field, MockBanner, PageHeader, StatusPill, Thumb } from '../components/ui';
import { inr, num } from '../lib/format';

const MAX_PHOTOS = 4;
const MAX_BYTES = 10 * 1024 * 1024;

function PhotoPicker({ files, setFiles }) {
  const toast = useToast();
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);
  function add(e) {
    const picked = [...e.target.files];
    e.target.value = '';
    for (const f of picked) {
      if (!/^image\/(jpeg|png)$/.test(f.type)) { toast.error(`${f.name}: only JPG and PNG are allowed.`); return; }
      if (f.size > MAX_BYTES) { toast.error(`${f.name}: each photo must be 10 MB or smaller.`); return; }
    }
    if (files.length + picked.length > MAX_PHOTOS) { toast.error(`A product can have at most ${MAX_PHOTOS} photos.`); return; }
    setFiles([...files, ...picked]);
  }
  return (
    <Field label="Photos" required hint={`1 to ${MAX_PHOTOS} photos, JPG or PNG, up to 10 MB each. The first is the cover.`}>
      <div className="flex flex-wrap gap-2 mb-2">
        {previews.map((p, i) => (
          <div key={p} className="relative">
            <img src={p} alt={`Photo ${i + 1}`} className="w-16 h-16 object-cover rounded-md border border-line" />
            <button type="button" aria-label={`Remove photo ${i + 1}`} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bad text-white text-xs" onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
      </div>
      {files.length < MAX_PHOTOS && <input type="file" accept="image/jpeg,image/png" multiple onChange={add} />}
    </Field>
  );
}

function ProductForm({ vendor, product, onDone, onClose }) {
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [photoErr, setPhotoErr] = useState('');
  const ids = useAsync(() => suggestionsApi.get('customer_product_id'));
  // Categories and their sub-categories are the ones kept under Masters > Categories (active ones only).
  const catsReq = useAsync(() => masterApi('categories').list());
  const subsReq = useAsync(() => subCategoriesApi.list());
  const cats = (catsReq.data || []).filter((c) => c.status === 'active');
  const subsAll = (subsReq.data || []).filter((x) => x.status === 'active');
  // The product name follows the Supplier product ID until someone types in the name box themselves.
  const nameEdited = useRef(false);
  const f = useForm({
    category_id: product?.category_id ? String(product.category_id) : '', sub_category_id: product?.sub_category_id ? String(product.sub_category_id) : '',
    v_prod_id: product?.v_prod_id ?? '', product_name: product?.product_name ?? '', price: product?.price ?? '',
    customer_product_id: product?.customer_product_id ?? '', remarks: product?.remarks ?? '', status: product?.status ?? 'active',
  }, (v) => {
    const e = {};
    if (!String(v.v_prod_id).trim()) e.v_prod_id = 'Supplier product ID is required.';
    if (!String(v.product_name).trim()) e.product_name = 'Product name is required.';
    if (v.price === '' || isNaN(Number(v.price)) || Number(v.price) < 0) e.price = 'Enter a product cost of 0 or more.';
    // Required for new products; an older product without them can still be saved as it is.
    // (Not asked while no category or sub-category has been added yet.)
    if (cats.length && subsAll.length && (!product || product.category_id)) {
      if (!v.category_id) e.category_id = 'Choose a category.';
      if (!v.sub_category_id) e.sub_category_id = 'Choose a sub-category.';
    }
    return e;
  });

  const save = f.submit(async (v) => {
    setPhotoErr('');
    try {
      if (product) {
        await productsApi.update(product.product_id, { ...v, price: Number(v.price), photo_url: product.photo_url || '', category_id: v.category_id ? Number(v.category_id) : null, sub_category_id: v.sub_category_id ? Number(v.sub_category_id) : null });
        toast.success('Product updated.');
      } else {
        if (!files.length) { setPhotoErr('Add at least one photo.'); return; }
        const fd = new FormData();
        fd.append('vendor_id', vendor);
        ['v_prod_id', 'product_name', 'price', 'customer_product_id', 'remarks', 'category_id', 'sub_category_id'].forEach((k) => fd.append(k, String(v[k]).trim()));
        files.forEach((file) => fd.append('photos', file));
        await productsApi.create(fd);
        toast.success('Product added.');
      }
      onDone();
    } catch (e) { toast.error(e.message); }
  });

  const subChoices = f.values.category_id ? subsAll.filter((x) => String(x.category_id) === f.values.category_id) : subsAll;

  return (
    <Drawer open title={product ? 'Edit product' : 'Add product'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="product-form" disabled={f.busy}>{f.busy ? 'Saving…' : 'Save'}</button></>}>
      <form id="product-form" onSubmit={save} noValidate>
        <Field label="Supplier product ID" required error={f.errors.v_prod_id} hint="Unique for this supplier, ignoring case."><input className="input" {...f.bind('v_prod_id')} onChange={(e) => { f.set('v_prod_id', e.target.value); if (!product && !nameEdited.current) f.set('product_name', e.target.value); }} /></Field>
        <Field label="Product name" required error={f.errors.product_name}><input className="input" {...f.bind('product_name')} onChange={(e) => { nameEdited.current = e.target.value !== ''; f.set('product_name', e.target.value); }} /></Field>
        <Field label="Category" required error={f.errors.category_id}>
          <select className="input" value={f.values.category_id} onChange={(e) => {
            const id = e.target.value; f.set('category_id', id);
            const sub = subsAll.find((x) => String(x.sub_category_id) === f.values.sub_category_id);
            if (sub && String(sub.category_id) !== id) f.set('sub_category_id', ''); // that sub-category no longer fits
          }}>
            <option value="">Select a category</option>
            {cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
          </select>
        </Field>
        <Field label="Sub-category" required error={f.errors.sub_category_id} hint={f.values.category_id ? undefined : 'Pick a sub-category and its category is filled in for you.'}>
          <select className="input" value={f.values.sub_category_id} onChange={(e) => {
            const id = e.target.value; f.set('sub_category_id', id);
            const sub = subsAll.find((x) => String(x.sub_category_id) === id);
            if (sub) f.set('category_id', String(sub.category_id)); // its category fills in automatically
          }}>
            <option value="">Select a sub-category</option>
            {subChoices.map((x) => <option key={x.sub_category_id} value={x.sub_category_id}>{f.values.category_id ? x.sub_category_name : `${x.category_name} › ${x.sub_category_name}`}</option>)}
          </select>
        </Field>
        <Field label="Product cost" required error={f.errors.price}><input className="input" inputMode="decimal" {...f.bind('price')} /></Field>
        <Field label="Customer product ID">
          <input className="input" list="cust-ids" {...f.bind('customer_product_id')} />
          <datalist id="cust-ids">{(ids.data || []).map((x) => <option key={x} value={x} />)}</datalist>
        </Field>
        <Field label="Remarks"><textarea className="input" rows={2} {...f.bind('remarks')} /></Field>
        {product ? (
          <Field label="Status"><select className="input" {...f.bind('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
        ) : (<><PhotoPicker files={files} setFiles={setFiles} />{photoErr && <div role="alert" className="text-xs text-bad -mt-2 mb-3">{photoErr}</div>}</>)}
      </form>
    </Drawer>
  );
}

export default function Products() {
  const toast = useToast();
  const vendors = useAsync(() => vendorsApi.list());
  const [vendor, setVendor] = useState(() => localStorage.getItem('shinde_vendor') || '');
  const { data, loading, error, reload } = useAsync(() => productsApi.listByVendor(vendor), [vendor], { enabled: !!vendor });
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const pick = (v) => { setVendor(v); localStorage.setItem('shinde_vendor', v); };
  const rows = (data || []).map((p) => ({ ...p, __key: p.product_id }));
  const activeVendors = (vendors.data || []).filter((v) => v.status === 'active');

  async function deactivate() {
    const p = confirm;
    try {
      await productsApi.update(p.product_id, { v_prod_id: p.v_prod_id, product_name: p.product_name, photo_url: p.photo_url || '', customer_product_id: p.customer_product_id || '', remarks: p.remarks || '', price: num(p.price), status: 'inactive' });
      toast.success(`${p.product_name} deactivated.`);
      setConfirm(null); reload();
    } catch (e) { toast.error(e.message); }
  }

  return (
    <>
      <PageHeader title="Products"
        actions={<Can perm="product.create"><button className="btn btn-primary" disabled={!vendor} onClick={() => setEdit({})}>Add product</button></Can>} />
      <MockBanner>A deactivated product leaves this list and cannot be switched back on here. Photos cannot be changed after the product is saved.</MockBanner>
      <div className="card p-3 mb-3 flex items-center gap-3">
        <label className="label m-0" htmlFor="vsel">Supplier</label>
        <select id="vsel" className="input max-w-xs" value={vendor} onChange={(e) => pick(e.target.value)}>
          <option value="">Select a supplier</option>
          {activeVendors.map((v) => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
        </select>
      </div>
      {!vendor ? <div className="card p-10 text-center text-muted">Choose a supplier to see its products.</div> : (
        <DataTable rows={rows} loading={loading} error={error} onRetry={reload} emptyTitle="No active products for this supplier"
          searchText={(p) => [p.v_prod_id, p.product_name, p.customer_product_id, p.remarks].join(' ')}
          columns={[
            { header: 'Image', render: (p) => <Thumb src={p.photo_url} size={44} /> },
            { header: 'Product', render: (p) => <div><div className="font-medium">{p.product_name}</div><div className="text-xs text-muted font-mono">{p.v_prod_id}</div></div> },
            { header: 'Category', render: (p) => (p.category_name ? <div><div>{p.category_name}</div><div className="text-xs text-muted">{p.sub_category_name || ''}</div></div> : '-') },
            { header: 'Customer ID', key: 'customer_product_id' },
            { header: 'Product cost', render: (p) => inr(p.price), className: 'text-right' },
            { header: 'Variants', render: (p) => <Link to={`/products/${p.product_id}/variants`}>{num(p.variant_count)} variants</Link> },
            { header: 'Status', render: (p) => <StatusPill value={p.status} /> },
            { header: '', className: 'text-right', render: (p) => (
              <div className="flex gap-1.5 justify-end">
                <Can perm="product.edit"><button className="btn btn-sm" onClick={() => setEdit(p)}>Edit</button></Can>
                <Can perm="product.activate"><button className="btn btn-sm" onClick={() => setConfirm(p)}>Deactivate</button></Can>
              </div>) },
          ]} />
      )}
      {edit && <ProductForm vendor={vendor} product={edit.product_id ? edit : null} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); }} />}
      <Confirm open={!!confirm} danger title="Deactivate product" body={`${confirm?.product_name} will disappear from this list and from new orders.`} confirmLabel="Deactivate" onConfirm={deactivate} onClose={() => setConfirm(null)} />
    </>
  );
}
