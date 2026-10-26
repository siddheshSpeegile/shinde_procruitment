import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi, vendorsApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { Can, DataTable, PageHeader, Pill, StatusPill, Thumb } from '../components/ui';

export const deliveryTone = (s) => (s === 'delayed' ? 'bad' : s === 'delivered' ? 'ok' : 'info');

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
      <DataTable rows={rows} loading={loading} error={error} onRetry={reload} emptyTitle="No orders match" emptyHint="Change the filters or create a new order."
        searchText={(o) => `${o.po} ${o.brand}`}
        toolbar={<>
          <select className="input max-w-[200px]" aria-label="Vendor" value={f.vendorId} onChange={set('vendorId')}>
            <option value="">All vendors</option>{(vendors.data || []).map((v) => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
          </select>
          <select className="input max-w-[150px]" aria-label="Delivery" value={f.deliveryStatus} onChange={set('deliveryStatus')}>
            <option value="all">All delivery</option><option value="pending">Pending</option><option value="delayed">Delayed</option><option value="delivered">Delivered</option>
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
