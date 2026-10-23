import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { colorHexApi, masterApi, productsApi, suggestionsApi, variantsApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useForm } from '../hooks/useForm';
import { useToast } from '../context/ToastContext';
import { Can, DataTable, Drawer, Field, PageHeader, Spinner, StatusPill, Swatch } from '../components/ui';
import { isHex } from '../lib/validate';

function VariantForm({ productId, onDone, onClose }) {
  const toast = useToast();
  const cats = useAsync(() => suggestionsApi.get('category'));
  const cols = useAsync(() => suggestionsApi.get('colour'));
  const pats = useAsync(() => masterApi('patterns').list());
  const [hex, setHex] = useState({ source: 'checking', value: '#8a3230' });
  const f = useForm({ category: '', color: '', pattern: 'Standard', remarks: '' }, (v) => {
    const e = {};
    if (!v.category.trim()) e.category = 'Category is required.';
    if (!v.color.trim()) e.color = 'Colour is required.';
    if (hex.source === 'none' && !isHex(hex.value)) e.color = 'Pick a swatch colour.';
    return e;
  });

  const checkHex = async () => {
    const name = f.values.color.trim();
    if (!name) return;
    try { const r = await colorHexApi.resolve(name); setHex(r.source ? { source: r.source, value: r.hex_code } : { source: 'none', value: hex.value }); }
    catch { setHex({ source: 'none', value: hex.value }); }
  };

  const save = f.submit(async (v) => {
    try {
      await variantsApi.createQuick({ product_id: Number(productId), category: v.category.trim(), color: v.color.trim(), pattern: v.pattern.trim() || 'Standard', remarks: v.remarks, ...(hex.source === 'none' ? { hex_code: hex.value } : {}) });
      toast.success('Variant added. Assign sizes next.');
      onDone();
    } catch (e) { toast.error(e.message); }
  });

  return (
    <Drawer open title="Add variant" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="variant-form" disabled={f.busy}>{f.busy ? 'Saving…' : 'Add variant'}</button></>}>
      <form id="variant-form" onSubmit={save} noValidate>
        <Field label="Category" required error={f.errors.category} hint="Pick a suggestion or type a new one. New values are created automatically.">
          <input className="input" list="v-cats" {...f.bind('category')} /><datalist id="v-cats">{(cats.data || []).map((x) => <option key={x} value={x} />)}</datalist>
        </Field>
        <Field label="Colour" required error={f.errors.color}>
          <div className="flex items-center gap-2">
            <input className="input" list="v-cols" {...f.bind('color')} onBlur={checkHex} />
            {hex.source !== 'checking' && <Swatch hex={hex.value} />}
          </div>
          <datalist id="v-cols">{(cols.data || []).map((x) => <option key={x} value={x} />)}</datalist>
        </Field>
        {hex.source === 'none' && (
          <Field label="Swatch colour" hint="This colour name is new. Pick how it should look.">
            <input type="color" value={isHex(hex.value) ? hex.value : '#000000'} onChange={(e) => setHex({ source: 'none', value: e.target.value })} />
          </Field>
        )}
        <Field label="Pattern">
          <input className="input" list="v-pats" {...f.bind('pattern')} /><datalist id="v-pats">{(pats.data || []).map((x) => <option key={x.pattern_id} value={x.pattern_name} />)}</datalist>
        </Field>
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
  async function save() {
    if (!sel.size) { toast.error('Select at least one size. The backend cannot save an empty selection.'); return; }
    setBusy(true);
    try { await variantsApi.assignSizes(variant.variant_id, [...sel]); toast.success('Sizes saved.'); onDone(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <Drawer open title={`Sizes · ${variant.color_name}`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={busy || !sel}>{busy ? 'Saving…' : `Save ${sel ? sel.size : 0} sizes`}</button></>}>
      {loading || !sel ? <Spinner /> : error ? <div className="text-bad">{error.message}</div> : (
        <>
          <p className="text-muted mt-0">Saving replaces the full selection. Sizes 1 to 12 are listed.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sizes">
            {data.map((s) => (
              <button key={s.size_id} type="button" aria-pressed={sel.has(s.size_id)} onClick={() => toggle(s.size_id)}
                className="w-14 h-10 rounded-md border text-sm font-medium" style={sel.has(s.size_id) ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' } : { background: 'var(--surface)', borderColor: 'var(--line)' }}>
                {s.size_value}
              </button>
            ))}
          </div>
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
      <PageHeader title={product.data ? `Variants · ${product.data.product_name}` : 'Variants'} sub={<><Link to="/products">Products</Link> / {product.data?.v_prod_id}</>}
        actions={<Can perm="variant.create"><button className="btn btn-primary" onClick={() => setAdd(true)}>Add variant</button></Can>} />
      <DataTable rows={rows} loading={loading} error={error} onRetry={reload} emptyTitle="No variants yet" emptyHint="Add a colour and pattern, then assign sizes."
        columns={[
          { header: 'Colour', render: (v) => <span className="flex items-center gap-2"><Swatch hex={v.hex_code} />{v.color_name}</span> },
          { header: 'Pattern', key: 'pattern_name' },
          { header: 'Category', key: 'category_name' },
          { header: 'Gender', render: (v) => v.gender_name || '-' },
          { header: 'Sizes', render: (v) => `${v.size_count} assigned` },
          { header: 'Remarks', render: (v) => v.remarks || '-' },
          { header: 'Status', render: (v) => <StatusPill value={v.status} /> },
          { header: '', className: 'text-right', render: (v) => <Can perm="variant.edit"><button className="btn btn-sm" onClick={() => setSizes(v)}>Assign sizes</button></Can> },
        ]} />
      {add && <VariantForm productId={productId} onClose={() => setAdd(false)} onDone={() => { setAdd(false); reload(); }} />}
      {sizes && <SizeDrawer variant={sizes} onClose={() => setSizes(null)} onDone={() => { setSizes(null); reload(); }} />}
    </>
  );
}
