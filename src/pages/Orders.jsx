import { useState } from 'react';
import { Link } from 'react-router-dom';
import { draftsApi, ordersApi, vendorsApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Can, Confirm, DataTable, PageHeader, Pill, StatusPill, Thumb } from '../components/ui';
import { timeAgo } from '../lib/format';

export const deliveryTone = (s) => (s === 'delayed' || s === 'rejected' ? 'bad' : s === 'awaiting_approval' ? 'warn' : s === 'delivered' ? 'ok' : 'info');

/** The signed-in user's saved, unfinished order forms. Shown only when there are some. */
function Drafts() {
  const { can } = useAuth();
  const toast = useToast();
  const { data, reload } = useAsync(() => draftsApi.list(), [], { enabled: can('purchase_order.create') });
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!data?.length) return null;

  async function remove() {
    setBusy(true);
    try { await draftsApi.remove(del.id); toast.success('Draft deleted.'); setDel(null); reload(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <section className="card mb-4" aria-label="Your drafts">
      <div className="px-4 py-2 border-b border-line">
        <h2 className="font-serif text-lg m-0">Your drafts <span className="text-muted text-sm">({data.length})</span></h2>
        <div className="text-xs text-muted">Orders you started and saved. They are not submitted and only you can see them.</div>
      </div>
      {data.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-line last:border-0">
          <div className="flex-1 min-w-[180px]">
            <div className="font-medium">{d.vendor_name || 'No vendor chosen'}</div>
            <div className="text-xs text-muted">{d.products} {d.products === 1 ? 'product' : 'products'}, {d.quantity} pieces, saved {timeAgo(d.updated_at)}</div>
          </div>
          <Link to={`/refill-stock/new?draft=${d.id}`} className="btn btn-sm btn-primary no-underline">Continue</Link>
          <button className="btn btn-sm btn-danger" onClick={() => setDel(d)}>Delete</button>
        </div>
      ))}
      <Confirm open={!!del} danger busy={busy} title="Delete this draft?" confirmLabel="Delete draft" onClose={() => setDel(null)} onConfirm={remove}
        body="The saved order form is removed. This cannot be undone." />
    </section>
  );
}

export default function Orders() {
  const vendors = useAsync(() => vendorsApi.list());
  const [f, setF] = useState({ vendorId: '', deliveryStatus: 'all', dateFrom: '', dateTo: '' });
  const { data, loading, error, reload } = useAsync(() => ordersApi.list({ ...f, deliveryStatus: f.deliveryStatus === 'all' ? '' : f.deliveryStatus }), [f.vendorId, f.deliveryStatus, f.dateFrom, f.dateTo]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const rows = (data || []).map((o) => ({ ...o, __key: o.id }));
  const bad = f.dateFrom && f.dateTo && f.dateFrom > f.dateTo;

  return (
    <>
      <PageHeader title="Purchase Orders" sub="Filter by vendor, delivery status and expected delivery date."
        actions={<Can perm="purchase_order.create"><Link to="/refill-stock/new" className="btn btn-primary no-underline">New Refill Stock order</Link></Can>} />
      <Drafts />
      <DataTable rows={rows} loading={loading} error={error} onRetry={reload} emptyTitle="No orders match" emptyHint="Change the filters or create a new order."
        searchText={(o) => `${o.po} ${o.brand}`}
        toolbar={<>
          <select className="input max-w-[200px]" aria-label="Vendor" value={f.vendorId} onChange={set('vendorId')}>
            <option value="">All vendors</option>{(vendors.data || []).map((v) => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
          </select>
          <select className="input max-w-[150px]" aria-label="Delivery" value={f.deliveryStatus} onChange={set('deliveryStatus')}>
            <option value="all">All delivery</option><option value="pending">Pending</option><option value="delayed">Delayed</option><option value="delivered">Delivered</option><option value="awaiting_approval">Waiting for approval</option><option value="rejected">Rejected</option>
          </select>
          <label className="flex items-center gap-1 text-xs text-muted">Due from <input type="date" className="input w-[140px]" value={f.dateFrom} onChange={set('dateFrom')} /></label>
          <label className="flex items-center gap-1 text-xs text-muted">to <input type="date" className="input w-[140px]" value={f.dateTo} onChange={set('dateTo')} /></label>
          {bad && <span role="alert" className="text-xs text-bad">From date is after the to date.</span>}
        </>}
        columns={[
          { header: '', render: (o) => <Thumb src={o.image} /> },
          { header: 'PO', render: (o) => <Link to={`/purchase-orders/${o.id}`} className="font-mono">{o.po}</Link> },
          { header: 'Vendor', key: 'brand' },
          { header: 'Order date', key: 'date' },
          { header: 'Expected', render: (o) => o.expected_delivery_date || '-' },
          { header: 'Amount', key: 'price', className: 'text-right' },
          { header: 'Status', render: (o) => <StatusPill value={o.status} /> },
          { header: 'Delivery', render: (o) => <Pill tone={deliveryTone(o.delivery.state)}>{o.delivery.message}</Pill> },
          { header: 'Payment', render: (o) => <StatusPill value={o.payment_status} /> },
        ]} />
    </>
  );
}
