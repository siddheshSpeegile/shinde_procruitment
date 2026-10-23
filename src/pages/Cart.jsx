import { Link, useSearchParams } from 'react-router-dom';
import { cartApi, vendorsApi } from '../api/endpoints';
import { useAsync } from '../hooks/useAsync';
import { Can, DataTable, MockBanner, PageHeader, Thumb } from '../components/ui';
import { fmtDate } from '../lib/format';

export default function Cart() {
  const [sp, setSp] = useSearchParams();
  const vendor = sp.get('vendorId') || '';
  const vendors = useAsync(() => vendorsApi.list());
  const { data, loading, error, reload } = useAsync(() => cartApi.list(vendor), [vendor], { enabled: !!vendor });
  const rows = (data || []).map((c) => ({ ...c, __key: c.cart_id }));

  return (
    <>
      <PageHeader title="Cart" sub="GET /api/cart?vendorId= · read only"
        actions={vendor && <Can perm="purchase_order.create"><Link className="btn btn-primary no-underline" to={`/refill-stock/new?vendorId=${vendor}&fromCart=1`}>Create order from cart</Link></Can>} />
      <MockBanner>The cart belongs to a vendor, not to a user, and is filled from the mobile app. The backend has no hold list endpoint, see Hold List.</MockBanner>
      <div className="card p-3 mb-3 flex items-center gap-3">
        <label className="label m-0" htmlFor="cv">Vendor</label>
        <select id="cv" className="input max-w-xs" value={vendor} onChange={(e) => setSp(e.target.value ? { vendorId: e.target.value } : {})}>
          <option value="">Select a vendor</option>{(vendors.data || []).map((v) => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
        </select>
      </div>
      {!vendor ? <div className="card p-10 text-center text-muted">Choose a vendor to see its cart.</div> : (
        <DataTable rows={rows} loading={loading} error={error} onRetry={reload} emptyTitle="This cart is empty" emptyHint="Items added in the mobile app appear here."
          columns={[
            { header: 'Image', render: (c) => <Thumb src={c.photo_url} /> },
            { header: 'Product', render: (c) => <div><div className="font-medium">{c.product_name}</div><div className="text-xs text-muted font-mono">{c.v_prod_id}</div></div> },
            { header: 'Variants', key: 'variant_count' },
            { header: 'Selected sizes', render: (c) => (c.selected_sizes || []).join(', ') || '-' },
            { header: 'Added', render: (c) => fmtDate(c.created_date) },
          ]} />
      )}
    </>
  );
}
