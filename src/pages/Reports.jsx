import { useMemo } from 'react';
import { ordersApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { DataTable, ErrorState, MockBanner, PageHeader, Spinner } from '../components/ui';
import { inr } from '../lib/format';

const amt = (s) => Number(String(s).replace(/[^\d.]/g, '')) || 0;

export default function Reports() {
  const { data, loading, error, reload } = useAsync(() => ordersApi.list());
  const { byVendor, byStatus } = useMemo(() => {
    const v = {}, s = {};
    (data || []).forEach((o) => {
      const a = (v[o.brand] ||= { brand: o.brand, orders: 0, amount: 0, delayed: 0 });
      a.orders += 1; a.amount += amt(o.price); if (o.delivery.state === 'delayed') a.delayed += 1;
      const b = (s[o.delivery.state] ||= { state: o.delivery.state, orders: 0, amount: 0 });
      b.orders += 1; b.amount += amt(o.price);
    });
    return { byVendor: Object.values(v).map((x) => ({ ...x, __key: x.brand })), byStatus: Object.values(s).map((x) => ({ ...x, __key: x.state })) };
  }, [data]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Reports" sub="Computed in the browser from GET /api/orders/all" />
      <MockBanner>Report formulas are not defined yet. These are simple totals over all orders, not final report logic.</MockBanner>
      <h2 className="font-serif text-xl m-0 mb-2">By delivery state</h2>
      <DataTable rows={byStatus} emptyTitle="No orders" columns={[{ header: 'State', render: (r) => <span className="capitalize">{r.state}</span> }, { header: 'Orders', key: 'orders' }, { header: 'Value', render: (r) => inr(r.amount), className: 'text-right' }]} />
      <h2 className="font-serif text-xl mt-6 mb-2">By vendor</h2>
      <DataTable rows={byVendor} emptyTitle="No orders" columns={[{ header: 'Vendor', key: 'brand' }, { header: 'Orders', key: 'orders' }, { header: 'Delayed', key: 'delayed' }, { header: 'Value', render: (r) => inr(r.amount), className: 'text-right' }]} />
    </>
  );
}
