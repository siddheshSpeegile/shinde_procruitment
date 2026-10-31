import { Fragment } from 'react';
import { resolveImage } from '../config';
import { fmtDate, inr, inr2, num } from '../lib/format';
import { groupSizes } from '../lib/sizes';

// The printed purchase order (Print button on the order page). It is hidden on screen and shown only when printing,
// as a branded A4 sheet. The page margins come from the repeating top / bottom rows of the outer table, so every
// printed page keeps the same spacing without the browser's own header and footer.
const label = (s) => { const t = String(s || '-').replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };

function Info({ title, rows }) {
  return (
    <div className="os-box">
      <div className="os-box-title">{title}</div>
      {rows.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (
        <div key={k} className="os-line"><span className="os-k">{k}</span><span className="os-v">{v}</span></div>
      ))}
    </div>
  );
}

export default function OrderSheet({ po, vendor, groups, qty, total, deliveryText }) {
  const paid = po.payment_status === 'paid';
  const supplier = vendor || {};
  return (
    <table className="os">
      <thead><tr><td><div className="os-gap" /></td></tr></thead>
      <tfoot><tr><td><div className="os-gap" /></td></tr></tfoot>
      <tbody><tr><td className="os-page">
        <header className="os-head">
          <img src="/logo-red-en.png" alt="Shinde Shoes" className="os-logo" />
          <div className="os-title">
            <div className="os-doc">Purchase Order</div>
            <div className="os-po">PO-{po.po_id}</div>
            <div className="os-date">Order date {fmtDate(po.order_date)}</div>
          </div>
        </header>
        <div className="os-rule" />

        <div className="os-cols">
          <Info title="Supplier" rows={[
            ['Name', supplier.vendor_name], ['Code', supplier.vendor_code], ['Contact', supplier.contact_person],
            ['Mobile', supplier.mobile_number], ['Email', supplier.email], ['GST no.', supplier.gst_number], ['PAN', supplier.pan_number], ['Address', supplier.address],
          ]} />
          <Info title="Order details" rows={[
            ['Order date', fmtDate(po.order_date)], ['Expected delivery', fmtDate(po.expected_delivery_date)],
            ['Status', label(po.status)], ['Delivery', deliveryText], ['Payment', label(po.payment_status)],
            ['Created by', po.created_by_name], ['Approved by', po.reviewed_by_name],
          ]} />
        </div>

        {Object.entries(groups).map(([pid, vs]) => {
          const p = po.products.find((x) => String(x.product_id) === String(pid));
          const rowsOf = vs.flatMap((x) => x.rows);
          const pQty = rowsOf.reduce((a, s) => a + num(s.qty), 0);
          const pAmt = rowsOf.reduce((a, s) => a + num(s.cost) * num(s.qty), 0);
          return (
            <section key={pid} className="os-product">
              <div className="os-product-head">
                {p?.photo_url ? <img src={resolveImage(p.photo_url)} alt="" className="os-thumb" /> : <span className="os-thumb" />}
                <div className="os-product-name"><b>{p?.product_name || 'Product'}</b><span>{p?.v_prod_id}</span></div>
                <div className="os-product-total">{pQty} pcs · {inr(pAmt)}</div>
              </div>
              {vs.map(({ vid, v, rows }) => (
                <div key={vid} className="os-variant">
                  <div className="os-variant-name">{v?.label || 'Variant not recorded'}</div>
                  <table className="os-table">
                    <thead><tr>{['Size', 'Qty', 'Cost', 'MRP', 'GST %', 'Amount'].map((h, i) => <th key={h} className={i ? 'r' : ''}>{h}</th>)}</tr></thead>
                    <tbody>
                      {groupSizes(rows).map((g) => (
                        <Fragment key={g.title || 'sizes'}>
                          {g.title && <tr className="os-group"><td colSpan={6}>{g.title}</td></tr>}
                          {g.items.map((s) => (
                            <tr key={s.po_size_id ?? `${vid}-${s.size_id}`}>
                              <td>{s.size_value}</td><td className="r">{num(s.qty)}</td><td className="r">{inr(s.cost)}</td>
                              <td className="r">{inr(s.mrp)}</td><td className="r">{num(s.gst)}</td><td className="r">{inr(num(s.cost) * num(s.qty))}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          );
        })}

        <div className="os-summary">
          <div className="os-note">
            {po.remarks ? <><b>Remarks</b><div>{po.remarks}</div></> : null}
            {paid && (
              <div className="os-paid">
                <b>Payment received</b>
                <div>{inr2(po.payment_amount)} by {po.payment_mode}{po.payment_reference ? ` (${po.payment_reference})` : ''}, {fmtDate(po.payment_date)}</div>
                {po.payment_remarks ? <div>{po.payment_remarks}</div> : null}
              </div>
            )}
          </div>
          <div className="os-total">
            <div><span>Total quantity</span><b>{qty} pcs</b></div>
            <div className="os-grand"><span>Order value</span><b>{inr(total)}</b></div>
          </div>
        </div>

        <div className="os-sign">
          <div><div className="os-sign-line">{po.created_by_name || ' '}</div>Prepared by</div>
          <div><div className="os-sign-line">{po.reviewed_by_name || ' '}</div>Approved by</div>
          <div><div className="os-sign-line"> </div>Supplier signature and stamp</div>
        </div>

        <footer className="os-foot">
          <img src="/logo-red-hi-600.png" alt="" className="os-foot-logo" />
          <span>Please confirm this order and deliver by the expected date. Thank you.</span>
          <span className="os-foot-id">PO-{po.po_id}</span>
        </footer>
      </td></tr></tbody>
    </table>
  );
}
