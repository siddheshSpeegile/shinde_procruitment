import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { cartApi, masterApi, ordersApi, productsApi, suggestionsApi, variantsApi, vendorsApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Field, PageHeader, Spinner, Swatch } from '../components/ui';
import { inr, isoDate, num, today, variantLabel } from '../lib/format';

const uid = () => Math.random().toString(36).slice(2);
const sizeRow = (s, p = {}) => ({ size_id: s.size_id, size_value: s.size_value, qty: '', cost: p.cost ?? '', mrp: p.mrp ?? '', gst: p.gst ?? '' });

function ProductBlock({ line, products, onChange, onRemove }) {
  const toast = useToast();
  const variants = useAsync(() => variantsApi.list(line.productId), [line.productId], { enabled: !!line.productId });
  const [adding, setAdding] = useState(false);

  async function addVariant(variantId) {
    const v = variants.data.find((x) => String(x.variant_id) === String(variantId));
    if (!v) return;
    setAdding(true);
    try {
      const sizes = (await variantsApi.sizes(v.variant_id)).filter((s) => s.assigned);
      if (!sizes.length) { toast.error('This variant has no sizes yet. Assign sizes under Products > Variants first.'); return; }
      const pr = await ordersApi.lastPricing(sizes.map((s) => ({ variant_id: v.variant_id, size_id: s.size_id, product_id: line.productId })));
      onChange({ ...line, variants: [...line.variants, { variantId: v.variant_id, label: variantLabel(v), hex: v.hex_code, sizes: sizes.map((s) => sizeRow(s, pr.find((x) => x.size_id === s.size_id))) }] });
    } catch (e) { toast.error(e.message); } finally { setAdding(false); }
  }

  const setCell = (vi, si, k, val) => onChange({ ...line, variants: line.variants.map((v, i) => (i !== vi ? v : { ...v, sizes: v.sizes.map((s, j) => (j !== si ? s : { ...s, [k]: val })) })) });
  const free = (variants.data || []).filter((v) => !line.variants.some((x) => x.variantId === v.variant_id));
  const product = products.find((p) => String(p.product_id) === String(line.productId));

  return (
    <div className="card mb-3">
      <div className="flex flex-wrap items-center gap-3 p-3 border-b border-line">
        <select className="input max-w-sm" aria-label="Product" value={line.productId} onChange={(e) => onChange({ ...line, productId: e.target.value, variants: [] })}>
          <option value="">Select a product</option>
          {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.v_prod_id} · {p.product_name}</option>)}
        </select>
        {product && <span className="text-xs text-muted">List price {inr(product.price)}</span>}
        <button className="btn btn-sm btn-danger ml-auto" onClick={onRemove}>Remove product</button>
      </div>
      {line.productId && (
        <div className="p-3">
          {line.variants.map((v, vi) => (
            <div key={v.variantId} className="mb-4">
              <div className="flex items-center gap-2 mb-1 font-medium"><Swatch hex={v.hex} />{v.label}
                <button className="btn btn-sm ml-auto" onClick={() => onChange({ ...line, variants: line.variants.filter((_, i) => i !== vi) })}>Remove variant</button></div>
              <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr>{['Size', 'Qty', 'Cost', 'MRP', 'GST %', 'Amount'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody>{v.sizes.map((s, si) => (
                  <tr key={s.size_id}>
                    <td className="td w-16">{s.size_value}</td>
                    {['qty', 'cost', 'mrp', 'gst'].map((k) => (
                      <td key={k} className="td"><input className="input h-8 w-24" type="number" min="0" step={k === 'qty' ? '1' : 'any'} aria-label={`${k} for size ${s.size_value}`} value={s[k]} onChange={(e) => setCell(vi, si, k, e.target.value)} list={k === 'gst' ? 'gst-list' : undefined} /></td>
                    ))}
                    <td className="td">{inr(num(s.qty) * num(s.cost))}</td>
                  </tr>))}</tbody>
              </table>
              </div>
            </div>
          ))}
          {variants.loading ? <Spinner /> : free.length === 0 ? (
            <div className="text-muted text-xs">{variants.data?.length ? 'All variants of this product are on the order.' : 'This product has no variants yet.'}</div>
          ) : (
            <select className="input max-w-xs" aria-label="Add variant" disabled={adding} value="" onChange={(e) => addVariant(e.target.value)}>
              <option value="">{adding ? 'Adding…' : 'Add a variant'}</option>
              {free.map((v) => <option key={v.variant_id} value={v.variant_id}>{variantLabel(v)} ({v.size_count} sizes)</option>)}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

/** Loads an existing order into the same shape the form uses (for editing and resubmitting). */
async function loadForEdit(id) {
  const po = await ordersApi.get(id);
  if (!['pending_approval', 'rejected'].includes(po.status)) throw new Error('Only an order that is waiting for approval or was rejected can be edited.');
  if ((po.sizes || []).some((s) => !s.variant_id)) throw new Error('This older order has no variant details, so it cannot be edited.');
  const vids = [...new Set(po.sizes.map((s) => s.variant_id))];
  const raw = await Promise.all(vids.map((v) => variantsApi.get(v)));
  const pids = [...new Set(raw.map((v) => v.product_id))];
  const lists = await Promise.all(pids.map((p) => variantsApi.list(p)));
  const sizeLists = await Promise.all(vids.map((v) => variantsApi.sizes(v)));
  const lines = pids.map((pid, pi) => ({
    id: uid(), productId: String(pid),
    variants: vids.filter((_, i) => raw[i].product_id === pid).map((vid) => {
      const i = vids.indexOf(vid);
      const row = lists[pi].find((x) => x.variant_id === vid) || raw[i];
      return {
        variantId: vid, label: variantLabel(row), hex: row.hex_code,
        sizes: sizeLists[i].filter((s) => s.assigned || po.sizes.some((p) => p.variant_id === vid && p.size_id === s.size_id)).map((s) => {
          const ex = po.sizes.find((p) => p.variant_id === vid && p.size_id === s.size_id);
          return { size_id: s.size_id, size_value: s.size_value, qty: ex ? String(ex.qty) : '', cost: ex ? String(num(ex.cost)) : '', mrp: ex ? String(num(ex.mrp)) : '', gst: ex ? String(num(ex.gst)) : '' };
        }),
      };
    }),
  }));
  return { po, lines };
}

export default function CreateOrder() {
  const nav = useNavigate();
  const toast = useToast();
  const { id } = useParams(); // present on /purchase-orders/:id/edit
  const editing = !!id;
  const { can } = useAuth();
  const canApprove = can('purchase_order.approve');
  const [sp] = useSearchParams();
  const vendors = useAsync(() => vendorsApi.list());
  const gst = useAsync(() => masterApi('gst-rates').list());
  const remarkHints = useAsync(() => suggestionsApi.get('order_remarks'));
  const [vendorId, setVendorId] = useState(sp.get('vendorId') || '');
  const [orderDate, setOrderDate] = useState(today());
  const [expected, setExpected] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState([]);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const products = useAsync(() => productsApi.listByVendor(vendorId), [vendorId], { enabled: !!vendorId });
  const existing = useAsync(() => loadForEdit(id), [id], { enabled: editing });
  const resubmit = editing && existing.data?.po.status === 'rejected';

  useEffect(() => {
    const d = existing.data;
    if (!d) return;
    setVendorId(String(d.po.vendor_id)); setOrderDate(isoDate(d.po.order_date)); setExpected(isoDate(d.po.expected_delivery_date));
    setRemarks(d.po.remarks || ''); setLines(d.lines);
  }, [existing.data]);

  const pickVendor = (v) => { setVendorId(v); setLines([]); };

  async function fromCart() {
    try {
      const rows = await cartApi.details(vendorId);
      if (!rows.length) { toast.info('The cart for this vendor is empty.'); return; }
      const pr = await ordersApi.lastPricing(rows.map((r) => ({ variant_id: r.variant_id, size_id: r.size_id, product_id: r.product_id })));
      const out = [];
      rows.forEach((r, i) => {
        let l = out.find((x) => x.productId === String(r.product_id));
        if (!l) out.push((l = { id: uid(), productId: String(r.product_id), variants: [] }));
        let v = l.variants.find((x) => x.variantId === r.variant_id);
        if (!v) l.variants.push((v = { variantId: r.variant_id, label: variantLabel(r), hex: r.hex_code, sizes: [] }));
        v.sizes.push(sizeRow(r, pr[i]));
      });
      setLines(out);
      toast.success('Cart loaded. Enter quantities and prices.');
    } catch (e) { toast.error(e.message); }
  }

  useEffect(() => { if (!editing && vendorId && sp.get('fromCart') && !lines.length) fromCart(); /* eslint-disable-next-line */ }, []);

  const all = lines.flatMap((l) => l.variants.flatMap((v) => v.sizes));
  const filled = all.filter((s) => num(s.qty) > 0);
  const totalQty = filled.reduce((a, s) => a + num(s.qty), 0);
  const total = filled.reduce((a, s) => a + num(s.qty) * num(s.cost), 0);

  function validate() {
    const e = [];
    if (!vendorId) e.push('Choose a vendor.');
    if (!orderDate) e.push('Order date is required.');
    if (!expected) e.push('Expected delivery date is required.');
    else if (orderDate && expected < orderDate) e.push('Expected delivery cannot be before the order date.');
    if (lines.some((l) => !l.productId)) e.push('Every product block needs a product, or remove it.');
    if (!filled.length) e.push('Enter a quantity for at least one size.');
    if (filled.some((s) => !(num(s.cost) > 0))) e.push('Every size with a quantity needs a cost above 0.');
    if (filled.some((s) => num(s.qty) % 1 !== 0)) e.push('Quantities must be whole numbers.');
    return e;
  }

  async function submit() {
    const e = validate();
    setErrors(e);
    if (e.length) return;
    const products = lines.map((l) => ({
      product_id: Number(l.productId),
      variants: l.variants.map((v) => ({
        variant_id: v.variantId,
        sizes: v.sizes.filter((s) => num(s.qty) > 0).map((s) => ({ size_id: s.size_id, qty: num(s.qty), cost: num(s.cost), mrp: num(s.mrp), gst: num(s.gst) })),
      })).filter((v) => v.sizes.length),
    })).filter((p) => p.variants.length);
    setBusy(true);
    try {
      if (editing) {
        await ordersApi.update(id, { order_date: orderDate, expected_delivery_date: expected, remarks, products });
        toast.success(resubmit ? `PO-${id} resubmitted for approval.` : `PO-${id} updated.`);
        nav(`/purchase-orders/${id}`);
      } else {
        const r = await ordersApi.create({ vendor_id: Number(vendorId), order_date: orderDate, expected_delivery_date: expected, remarks, products });
        toast.success(r.status === 'pending_approval' ? `PO-${r.po_id} submitted for approval.` : `PO-${r.po_id} created.`);
        nav(`/purchase-orders/${r.po_id}`);
      }
    } catch (ex) { toast.error(ex.message); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader back={editing ? { to: `/purchase-orders/${id}`, label: `Back to PO-${id}` } : { to: '/purchase-orders', label: 'Back', useHistory: true }}
        title={editing ? `${resubmit ? 'Edit and resubmit' : 'Edit'} PO-${id}` : 'Refill Stock'}
        sub={<><Link to="/purchase-orders">Purchase Orders</Link> / {editing ? `PO-${id}` : 'New order'}</>} />
      {editing && existing.loading && <Spinner />}
      {editing && existing.error && <div className="card p-6 text-bad" role="alert">{existing.error.message}</div>}
      {resubmit && existing.data?.po.review_note && (
        <div className="rounded-md px-4 py-3 mb-4" role="status" style={{ background: 'var(--bad-bg)', color: 'var(--bad-fg)' }}>
          <b>Feedback to fix:</b> <span className="whitespace-pre-wrap">{existing.data.po.review_note}</span>
        </div>
      )}
      {(!editing || existing.data) && (
      <div className="grid gap-4 lg:grid-cols-[1fr_280px] items-start">
        <div>
          <div className="card p-4 mb-3 grid gap-x-4 sm:grid-cols-2">
            <Field label="Vendor" required>
              <select className="input" value={vendorId} disabled={editing} onChange={(e) => pickVendor(e.target.value)}>
                <option value="">Select a vendor</option>{(vendors.data || []).filter((v) => v.status === 'active').map((v) => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
              </select>
            </Field>
            <Field label="Order date" required><input type="date" className="input" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></Field>
            <Field label="Expected delivery" required><input type="date" className="input" min={orderDate} value={expected} onChange={(e) => setExpected(e.target.value)} /></Field>
            <Field label="Remarks">
              <input className="input" list="order-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              <datalist id="order-remarks">{(remarkHints.data || []).map((x) => <option key={x} value={x} />)}</datalist>
            </Field>
          </div>
          <datalist id="gst-list">{(gst.data || []).filter((g) => g.status === 'active').map((g) => <option key={g.gst_id} value={Number(g.gst_rate)} />)}</datalist>
          {vendorId && (products.loading ? <Spinner /> : (
            <>
              {lines.map((l) => (
                <ProductBlock key={l.id} line={l} products={products.data || []}
                  onChange={(nl) => setLines(lines.map((x) => (x.id === l.id ? nl : x)))} onRemove={() => setLines(lines.filter((x) => x.id !== l.id))} />
              ))}
              <div className="flex gap-2">
                <button className="btn" onClick={() => setLines([...lines, { id: uid(), productId: '', variants: [] }])}>Add product</button>
                {!editing && <button className="btn" onClick={fromCart}>Load from cart</button>}
              </div>
            </>
          ))}
        </div>
        <aside className="card p-4 lg:sticky lg:top-0">
          <h2 className="font-serif text-xl m-0 mb-2">Summary</h2>
          <div className="flex justify-between"><span className="text-muted">Products</span><span>{lines.filter((l) => l.productId).length}</span></div>
          <div className="flex justify-between"><span className="text-muted">Sizes ordered</span><span>{filled.length}</span></div>
          <div className="flex justify-between"><span className="text-muted">Total quantity</span><span>{totalQty}</span></div>
          <div className="flex justify-between font-semibold text-base mt-2 pt-2 border-t border-line"><span>Order value</span><span>{inr(total)}</span></div>
          {errors.length > 0 && <ul role="alert" className="text-bad text-xs mt-3 pl-4 mb-0">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          <button className="btn btn-primary w-full mt-4" disabled={busy} onClick={submit}>
            {busy ? 'Saving…' : editing ? (resubmit ? 'Resubmit for approval' : 'Save changes') : canApprove ? 'Create order' : 'Submit for approval'}
          </button>
          <div className="text-xs text-muted mt-2">
            {editing
              ? (resubmit ? 'The order goes back to the Administrator for approval.' : 'The order stays waiting. Approve it from the order page when you are ready.')
              : canApprove ? 'The order is saved as Confirmed and the vendor cart is cleared.'
                : 'An Administrator has to approve this order before it is placed. They are notified as soon as you submit it.'}
          </div>
        </aside>
      </div>
      )}
    </>
  );
}
