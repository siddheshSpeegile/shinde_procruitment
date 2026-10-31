import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { dashboardApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { DataTable, ErrorState, PageHeader, Pill, Spinner, Thumb } from '../components/ui';
import { fmtDate, num } from '../lib/format';

function Kpi({ label, value, money, hint }) {
  const ref = useRef(null);
  useEffect(() => {
    const o = { v: 0 };
    const t = gsap.to(o, { v: num(value), duration: 0.9, ease: 'power2.out', onUpdate: () => {
      if (ref.current) ref.current.textContent = (money ? '₹' : '') + Math.round(o.v).toLocaleString('en-IN');
    } });
    return () => t.kill();
  }, [value, money]);
  return (
    <div className="card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div ref={ref} className="font-serif text-[30px] leading-tight mt-1">0</div>
      <div className="text-xs text-muted mt-1">{hint}</div>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(() => dashboardApi.get());
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const d = data;
  const rows = (d.recent_orders || []).map((o) => ({ ...o, __key: o.id }));

  return (
    <>
      <PageHeader title="Dashboard" sub="Counts cover orders that are not yet delivered." />
      <div className="grid gap-3.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))' }}>
        <Kpi label="Order value pending" value={d.order_amount} money hint="Orders not delivered" />
        <Kpi label="Pending orders" value={d.orders_count} hint="Not delivered" />
        <Kpi label="Suppliers with pending orders" value={d.vendors_count} />
      </div>
      <h2 className="font-serif text-xl m-0 mb-2">Pending orders</h2>
      <DataTable rows={rows} emptyTitle="No pending orders"
        columns={[
          { header: '', render: (o) => <Thumb src={o.image} /> },
          { header: 'PO', render: (o) => <Link to={`/purchase-orders/${o.id}`} className="font-mono">{o.po}</Link> },
          { header: 'Supplier', key: 'brand' },
          { header: 'Order date', render: (o) => o.date },
          { header: 'Expected', render: (o) => o.expected_delivery_date || '-' },
          { header: 'Amount', key: 'price', className: 'text-right' },
          { header: 'Delivery', render: (o) => <Pill tone={o.delivery.state === 'delayed' ? 'bad' : o.delivery.state === 'delivered' ? 'ok' : 'info'}>{o.delivery.message}</Pill> },
        ]} />
    </>
  );
}
