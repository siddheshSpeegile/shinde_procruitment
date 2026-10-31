import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resolveImage } from '../config';
import { inr } from '../lib/format';
import { masterApi, productsApi, variantsApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useForm } from '../hooks/useForm';
import { useToast } from '../context/ToastContext';
import { Can, DataTable, Drawer, Field, Modal, PageHeader, Spinner, StatusPill, Swatch } from '../components/ui';
import SizePicker from '../components/SizePicker';

// All photos of the product (cover first) so the user can see the product before choosing a variant.
function ProductGallery({ product, productId }) {
  const photos = useAsync(() => productsApi.photos(productId), [productId]);
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const urls = useMemo(() => {
    const list = (photos.data || []).map((p) => p.photo_url).filter(Boolean);
    if (!list.length && product?.photo_url) list.push(product.photo_url);
    return list.map(resolveImage).filter(Boolean);
  }, [photos.data, product]);
  const cur = urls[Math.min(idx, urls.length - 1)];

  return (
    <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-4 no-print">
      <div className="sm:w-[300px] flex-none">
        {photos.loading ? <div className="h-[260px] sm:h-[300px] rounded-lg border border-line bg-surface2 flex items-center justify-center text-muted">Loading photos…</div>
          : cur ? (
            <button type="button" onClick={() => setZoom(true)} aria-label="Enlarge photo" className="block w-full rounded-lg border border-line bg-surface2 overflow-hidden cursor-zoom-in p-0">
              <img src={cur} alt={product?.product_name || 'Product photo'} className="block w-full h-[260px] sm:h-[300px] object-contain" />
            </button>
          ) : <div className="h-[260px] sm:h-[300px] rounded-lg border border-line bg-surface2 flex items-center justify-center text-muted">No photo</div>}
        {urls.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-2" role="group" aria-label="Product photos">
            {urls.map((u, i) => (
              <button key={u} type="button" onClick={() => setIdx(i)} aria-label={`Photo ${i + 1} of ${urls.length}`} aria-pressed={i === idx}
                className="rounded-md overflow-hidden p-0 border-2 bg-surface" style={{ borderColor: i === idx ? 'var(--primary)' : 'var(--line)' }}>
                <img src={u} alt="" className="block w-14 h-14 object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="font-serif font-semibold text-xl leading-tight">{product?.product_name}</div>
        <div className="font-mono text-xs text-muted mt-0.5">{product?.v_prod_id}</div>
        <div className="mt-3 grid gap-1">
          <div><span className="text-muted">Product cost: </span><b>{inr(product?.price)}</b></div>
          {product?.customer_product_id && <div><span className="text-muted">Customer ID: </span>{product.customer_product_id}</div>}
          {product?.remarks && <div><span className="text-muted">Remarks: </span>{product.remarks}</div>}
          <div><span className="text-muted">Photos: </span>{urls.length}</div>
        </div>
        <div className="mt-3 text-xs text-muted">Look at the photos, then add or pick a variant below. Click a photo to enlarge it.</div>
      </div>
      <Modal open={zoom} title={product?.product_name || 'Photo'} width={900} onClose={() => setZoom(false)} footer={<button className="btn" onClick={() => setZoom(false)}>Close</button>}>
        {cur && <img src={cur} alt={product?.product_name || 'Product photo'} className="block w-full max-h-[70vh] object-contain" />}
      </Modal>
    </div>
  );
}

function VariantForm({ productId, product, existing, onDone, onClose }) {
  const toast = useToast();
  const cats = useAsync(() => masterApi('categories').list());
  const cols = useAsync(() => masterApi('colors').list());
  const active = (list) => (list || []).filter((x) => x.status === 'active');
  const same = (x, y) => String(x || '').toLowerCase() === String(y || '').toLowerCase();
  const isDuplicate = (v) => (existing || []).some((x) => same(x.category_name, v.category) && same(x.color_name, v.color));

  const f = useForm({ category: '', color: '', remarks: '' }, (v) => {
    const e = {};
    if (!v.category) e.category = 'Choose a category.';
    if (!v.color) e.color = 'Choose a colour.';
    if (v.category && v.color && isDuplicate(v)) e.color = `This product already has a ${v.color} variant in ${v.category}.`;
    return e;
  });

  // Start from the product's own category once the list has loaded.
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !cats.data) return;
    started.current = true;
    const own = active(cats.data).find((c) => c.category_id === product?.category_id);
    if (own) f.set('category', own.category_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats.data]);

  const hex = active(cols.data).find((c) => same(c.color_name, f.values.color))?.hex_code;

  const save = f.submit(async (v) => {
    try {
      // strict: the server only accepts values that already exist in the Masters lists.
      await variantsApi.createQuick({ product_id: Number(productId), category: v.category, color: v.color, remarks: v.remarks, strict: true });
      toast.success('Variant added. Assign sizes next.');
      onDone();
    } catch (e) { toast.error(e.message); }
  });

  const pick = (key, label, list, idKey, nameKey, error) => (
    <Field label={label} required error={error} hint="Choose from the list. New values are added under Masters.">
      <select className="input" {...f.bind(key)}>
        <option value="">Select {label.toLowerCase()}</option>
        {active(list).map((x) => <option key={x[idKey]} value={x[nameKey]}>{x[nameKey]}</option>)}
      </select>
    </Field>
  );

  return (
    <Drawer open title="Add variant" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="variant-form" disabled={f.busy}>{f.busy ? 'Saving…' : 'Add variant'}</button></>}>
      <form id="variant-form" onSubmit={save} noValidate>
        {pick('category', 'Category', cats.data, 'category_id', 'category_name', f.errors.category)}
        <div className="flex items-end gap-2">
          <div className="flex-1">{pick('color', 'Colour', cols.data, 'color_id', 'color_name', f.errors.color)}</div>
          {f.values.color && <span className="mb-3"><Swatch hex={hex} /></span>}
        </div>
        <Field label="Remarks"><textarea className="input" rows={2} {...f.bind('remarks')} /></Field>
      </form>
    </Drawer>
  );
}

function SizeDrawer({ variant, onDone, onClose }) {
  const toast = useToast();
  const { data, loading, error } = useAsync(() => variantsApi.sizes(variant.variant_id), [variant.variant_id]);
  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setSel(new Set(data.filter((s) => s.assigned).map((s) => s.size_id))); }, [data]);

  const toggle = (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleMany = (ids, on) => setSel((p) => { const n = new Set(p); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });
  async function save() {
    if (!sel.size) { toast.error('Select at least one size.'); return; }
    setBusy(true);
    try { await variantsApi.assignSizes(variant.variant_id, [...sel]); toast.success('Sizes saved.'); onDone(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <Drawer open title={`Sizes · ${variant.color_name}`} width={560} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy || !sel}>{busy ? 'Saving…' : `Save ${sel ? sel.size : 0} sizes`}</button></>}>
      {loading || !sel ? <Spinner /> : error ? <div className="text-bad">{error.message}</div> : (
        <>
          <p className="text-muted mt-0">Pick UK or EUR, then Toddler or Adult, and tick the sizes this variant comes in. You can mix lists. Saving replaces the full selection.</p>
          <SizePicker sizes={data} selected={sel} onToggle={toggle} onMany={toggleMany} />
        </>
      )}
    </Drawer>
  );
}

export default function Variants() {
  const { productId } = useParams();
  const product = useAsync(() => productsApi.get(productId), [productId]);
  const { data, loading, error, reload } = useAsync(() => variantsApi.list(productId), [productId]);
  const [add, setAdd] = useState(false);
  const [sizes, setSizes] = useState(null);
  const rows = (data || []).map((v) => ({ ...v, __key: v.variant_id }));

  return (
    <>
      <PageHeader back={{ to: '/products', label: 'Back to Products' }} title={product.data ? `Variants · ${product.data.product_name}` : 'Variants'} sub={<><Link to="/products">Products</Link> / {product.data?.v_prod_id}</>}
        actions={<Can perm="variant.create"><button className="btn btn-primary" onClick={() => setAdd(true)}>Add variant</button></Can>} />
      {product.data && <ProductGallery product={product.data} productId={productId} />}
      <DataTable rows={rows} loading={loading} error={error} onRetry={reload} emptyTitle="No variants yet" emptyHint="Add a colour, then assign sizes."
        columns={[
          { header: 'Colour', render: (v) => <span className="flex items-center gap-2"><Swatch hex={v.hex_code} />{v.color_name}</span> },
          { header: 'Category', key: 'category_name' },
          { header: 'Gender', render: (v) => v.gender_name || '-' },
          { header: 'Sizes', render: (v) => `${v.size_count} assigned` },
          { header: 'Remarks', render: (v) => v.remarks || '-' },
          { header: 'Status', render: (v) => <StatusPill value={v.status} /> },
          { header: '', className: 'text-right', render: (v) => <Can perm="variant.edit"><button className="btn btn-sm" onClick={() => setSizes(v)}>Assign sizes</button></Can> },
        ]} />
      {add && <VariantForm productId={productId} product={product.data} existing={data} onClose={() => setAdd(false)} onDone={() => { setAdd(false); reload(); }} />}
      {sizes && <SizeDrawer variant={sizes} onClose={() => setSizes(null)} onDone={() => { setSizes(null); reload(); }} />}
    </>
  );
}
