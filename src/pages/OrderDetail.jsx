import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { masterApi, ordersApi, variantsApi, vendorsApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useToast } from '../context/ToastContext';
import { Can, Confirm, ErrorState, Modal, PageHeader, Pill, Spinner, StatusPill, Thumb } from '../components/ui';
import { downloadCsv, fmtDate, inr, isoDate, num, today } from '../lib/format';

async function load(id) {
  const po = await ordersApi.get(id);
  const vids = [...new Set((po.sizes || []).map((s) => s.variant_id).filter(Boolean))];
  const [vs, cats, pats, cols, vendors] = await Promise.all([
    Promise.allSettled(vids.map((v) => variantsApi.get(v))),
    masterApi('categories').list(), masterApi('patterns').list(), masterApi('colors').list(), vendorsApi.list(),
  ]);
  const name = (list, idKey, nameKey, id) => list.find((x) => x[idKey] === id)?.[nameKey];
  const variants = {};
  vs.forEach((r, i) => {
    const id = vids[i];
    if (r.status !== 'fulfilled') { variants[id] = { variant_id: id, label: `Variant #${id}`, product_id: null }; return; }
    const v = r.value;
    const color = cols.find((c) => c.color_id === v.color_id);
    variants[id] = { ...v, hex: color?.hex_code, label: [color?.color_name, name(pats, 'pattern_id', 'pattern_name', v.pattern_id), name(cats, 'category_id', 'category_name', v.category_id)].filter(Boolean).join(' · ') };
  });
  return { po, variants, vendor: vendors.find((v) => v.vendor_id === po.vendor_id) };
}

function stateOf(po) {
  if (po.status === 'delivered') return { tone: 'ok', text: `Delivered ${fmtDate(po.delivered_date)}` };
  if (!po.expected_delivery_date) return { tone: 'neutral', text: 'Delivery date not set' };
  const d = Math.round((new Date(isoDate(po.expected_delivery_date)) - new Date(today())) / 86400000);
  return d < 0 ? { tone: 'bad', text: `Delayed by ${-d} day${d === -1 ? '' : 's'}` } : d === 0 ? { tone: 'info', text: 'Due today' } : { tone: 'info', text: `${d} day${d === 1 ? '' : 's'} left` };
}

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => load(id), [id]);
  const [dlg, setDlg] = useState(null);
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { po, variants, vendor } = data;

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); setDlg(null); reload(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const bySize = {};
  (po.sizes || []).forEach((s) => { (bySize[s.variant_id ?? 'none'] ||= []).push(s); });
  const groups = {};
  Object.entries(bySize).forEach(([vid, rows]) => {
    const v = variants[vid];
    const pid = v?.product_id ?? (po.products.length === 1 ? po.products[0].product_id : 'unknown');
    (groups[pid] ||= []).push({ vid, v, rows });
  });
  const total = (po.sizes || []).reduce((a, s) => a + num(s.cost) * num(s.qty), 0);
  const qty = (po.sizes || []).reduce((a, s) => a + num(s.qty), 0);
  const st = stateOf(po);

  function csv() {
    const out = [['PO', 'Vendor', 'Product code', 'Product', 'Variant', 'Size', 'Qty', 'Cost', 'MRP', 'GST %', 'Amount']];
    Object.entries(groups).forEach(([pid, vs]) => {
      const p = po.products.find((x) => String(x.product_id) === String(pid));
      vs.forEach(({ v, rows }) => rows.forEach((s) => out.push([`PO-${po.po_id}`, vendor?.vendor_name, p?.v_prod_id, p?.product_name, v?.label, s.size_value, s.qty, s.cost, s.mrp, s.gst, num(s.cost) * num(s.qty)])));
    });
    downloadCsv(`PO-${po.po_id}.csv`, out);
  }

  return (
    <>
      <PageHeader title={`PO-${po.po_id}`} sub={<><Link to="/purchase-orders">Purchase Orders</Link> / {vendor?.vendor_name || `Vendor #${po.vendor_id}`}</>}
        actions={<>
          <button className="btn" onClick={() => window.print()}>Print</button>
          <button className="btn" onClick={csv}>Download CSV</button>
          <Can perm="purchase_order.edit">
            <button className="btn" onClick={() => { setDate(isoDate(po.expected_delivery_date)); setDlg('date'); }}>Change expected date</button>
            <button className="btn" onClick={() => { setStatus(po.status); setDlg('status'); }}>Change status</button>
            <button className="btn" onClick={() => run(() => ordersApi.setPayment(po.po_id, po.payment_status === 'paid' ? 'unpaid' : 'paid'), 'Payment status updated.')}>Mark {po.payment_status === 'paid' ? 'unpaid' : 'paid'}</button>
          </Can>
          {po.status !== 'delivered' && <Can perm="purchase_order.edit"><button className="btn btn-primary" onClick={() => setDlg('deliver')}>Mark delivered</button></Can>}
        </>} />

      <div className="card p-4 mb-4 print-area grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
        {[['Vendor', vendor?.vendor_name], ['Order date', fmtDate(po.order_date)], ['Expected delivery', fmtDate(po.expected_delivery_date)], ['Quantity', qty], ['Order value', inr(total)], ['Remarks', po.remarks || '-']].map(([k, v]) => (
          <div key={k}><div className="text-xs text-muted">{k}</div><div className="font-medium">{v}</div></div>
        ))}
        <div><div className="text-xs text-muted">Status</div><StatusPill value={po.status} /></div>
        <div><div className="text-xs text-muted">Delivery</div><Pill tone={st.tone}>{st.text}</Pill></div>
        <div><div className="text-xs text-muted">Payment</div><StatusPill value={po.payment_status} /></div>
      </div>

      {Object.entries(groups).map(([pid, vs]) => {
        const p = po.products.find((x) => String(x.product_id) === String(pid));
        return (
          <div key={pid} className="card mb-4 overflow-hidden print-area">
            <div className="flex items-center gap-3 p-3 border-b border-line">
              <Thumb src={p?.photo_url} size={48} />
              <div><div className="font-medium">{p?.product_name || 'Product'}</div><div className="text-xs text-muted font-mono">{p?.v_prod_id}</div></div>
            </div>
            {vs.map(({ vid, v, rows }) => (
              <div key={vid} className="p-3 border-b border-line last:border-0">
                <div className="mb-2 font-medium">{v?.label || 'Variant not recorded'}</div>
                <table className="w-full border-collapse">
                  <thead><tr>{['Size', 'Qty', 'Cost', 'MRP', 'GST %', 'Amount'].map((h) => <th key={h} className="th text-right first:text-left">{h}</th>)}</tr></thead>
                  <tbody>{rows.map((s) => (
                    <tr key={s.po_size_id ?? `${vid}-${s.size_id}`}>
                      <td className="td">{s.size_value}</td><td className="td text-right">{num(s.qty)}</td><td className="td text-right">{inr(s.cost)}</td>
                      <td className="td text-right">{inr(s.mrp)}</td><td className="td text-right">{num(s.gst)}</td><td className="td text-right">{inr(num(s.cost) * num(s.qty))}</td>
                    </tr>))}</tbody>
                </table>
              </div>
            ))}
          </div>
        );
      })}

      <Confirm open={dlg === 'deliver'} title="Mark as delivered" body={`PO-${po.po_id} will be stamped as delivered now.`} confirmLabel="Mark delivered" busy={busy}
        onConfirm={() => run(() => ordersApi.markDelivered(po.po_id), 'Order marked as delivered.')} onClose={() => setDlg(null)} />
      <Modal open={dlg === 'date'} title="Expected delivery date" onClose={() => setDlg(null)}
        footer={<><button className="btn" onClick={() => setDlg(null)}>Cancel</button><button className="btn btn-primary" disabled={!date || busy} onClick={() => run(() => ordersApi.setExpected(po.po_id, date), 'Expected date updated.')}>Save</button></>}>
        <input type="date" className="input" aria-label="Expected delivery date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="text-xs text-muted mt-2">A past date on an undelivered order shows as delayed.</div>
      </Modal>
      <Modal open={dlg === 'status'} title="Order status" onClose={() => setDlg(null)}
        footer={<><button className="btn" onClick={() => setDlg(null)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={() => run(() => ordersApi.setStatus(po.po_id, status), 'Status updated.')}>Save</button></>}>
        <select className="input" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="draft">Draft</option><option value="confirmed">Confirmed</option><option value="delivered">Delivered</option>
        </select>
        <div className="text-xs text-muted mt-2">The database only allows draft, confirmed and delivered.</div>
      </Modal>
    </>
  );
}
