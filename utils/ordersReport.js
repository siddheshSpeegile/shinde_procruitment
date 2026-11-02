// Builds the printable "Supplier Orders" report (HTML) for the Orders screen
// of a Supplier Workspace: every order shown on screen, with its details,
// products and size lines. Printed / saved as PDF via utils/printHtml.

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const titleCase = (s) =>
  String(s || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Shared look of both reports below
const REPORT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1c1210; margin: 24px; font-size: 12px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #8a3230; }
  .sub { color: #6b5d59; margin-bottom: 14px; }
  .summary { display: flex; gap: 12px; margin-bottom: 18px; }
  .summary div { border: 1px solid #e2c3bd; border-radius: 8px; padding: 8px 12px; }
  .summary b { display: block; font-size: 15px; }
  .order { border: 1px solid #e2c3bd; border-radius: 10px; padding: 12px; margin-bottom: 14px; page-break-inside: avoid; }
  .order-head { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
  .amount { font-weight: bold; color: #8a3230; }
  table { width: 100%; border-collapse: collapse; }
  .meta td { vertical-align: top; padding: 2px 8px 6px 0; }
  .meta span { display: block; color: #8a7c78; font-size: 10.5px; }
  .grid { margin-top: 8px; }
  .grid th, .grid td { border: 1px solid #eadad6; padding: 5px 6px; text-align: left; }
  .grid th { background: #f6e9e6; }
  .grid tfoot td { font-weight: bold; background: #faf5f3; }
  .num { text-align: right !important; }
  .note { color: #6b5d59; margin-top: 4px; }
`;

const FILTER_LABELS = {
  all: "All",
  pending: "Pending",
  delayed: "Delayed",
  delivered: "Delivered",
};

// orders: rows from GET /orders/all (as shown on screen)
// details: { [po_id]: data from GET /orders/<po_id> } (missing = summary only)
export function buildOrdersReportHtml({
  supplierName,
  filter,
  dateFrom,
  dateTo,
  orders,
  details,
}) {
  let grandQty = 0;
  let grandAmount = 0;

  const orderBlocks = orders
    .map((o) => {
      const d = details[o.id];
      const sizes = d?.sizes || [];
      const products = d?.products || [];
      const qty = sizes.reduce((s, x) => s + Number(x.qty || 0), 0);
      const amount = sizes.reduce((s, x) => s + Number(x.amount || 0), 0);
      grandQty += qty;
      grandAmount += amount;

      const productRows = products
        .map(
          (p) => `<tr>
            <td>${esc(p.v_prod_id)}</td>
            <td>${esc(p.product_name)}</td>
            <td>${esc(p.brand_name || "—")}</td>
            <td>${esc(p.customer_product_id || "—")}</td>
          </tr>`,
        )
        .join("");

      const sizeRows = sizes
        .map(
          (x) => `<tr>
            <td>${esc(x.size_label || x.size_value)}</td>
            <td class="num">${esc(x.qty)}</td>
            <td class="num">${money(x.cost)}</td>
            <td class="num">${esc(Number(x.gst || 0))}%</td>
            <td class="num">${money(x.mrp)}</td>
            <td class="num">${money(x.amount)}</td>
          </tr>`,
        )
        .join("");

      const paid =
        d?.payment_status === "paid" && d?.payment_amount
          ? ` · Paid ${money(d.payment_amount)}${d.payment_date ? ` on ${esc(d.payment_date)}` : ""}${d.payment_mode ? ` (${esc(d.payment_mode)})` : ""}`
          : "";

      return `<section class="order">
        <div class="order-head">
          <div><b>${esc(o.po)}</b> &nbsp;·&nbsp; ${esc(o.brand)}</div>
          <div class="amount">${d ? money(amount) : esc(o.price)}</div>
        </div>
        <table class="meta"><tr>
          <td><span>Placed</span>${esc(o.date)}</td>
          <td><span>Expected delivery</span>${esc(o.expected_delivery_date || "—")}</td>
          <td><span>Delivery</span>${esc(o.delivery?.message || titleCase(o.status))}</td>
          <td><span>Status</span>${esc(titleCase(o.status))}</td>
          <td><span>Payment</span>${esc(titleCase(o.payment_status))}${paid}</td>
        </tr></table>
        ${d?.created_by_name ? `<div class="note">Created by: ${esc(d.created_by_name)}</div>` : ""}
        ${d?.remarks ? `<div class="note">Remarks: ${esc(d.remarks)}</div>` : ""}
        ${
          d
            ? `<table class="grid">
                <thead><tr><th>Product ID</th><th>Product Name</th><th>Brand</th><th>Customer Product ID</th></tr></thead>
                <tbody>${productRows || `<tr><td colspan="4">No products</td></tr>`}</tbody>
              </table>
              <table class="grid">
                <thead><tr><th>Size</th><th class="num">Qty</th><th class="num">Cost</th><th class="num">GST</th><th class="num">MRP</th><th class="num">Amount</th></tr></thead>
                <tbody>${sizeRows || `<tr><td colspan="6">No sizes</td></tr>`}</tbody>
                <tfoot><tr><td>Total</td><td class="num">${qty}</td><td></td><td></td><td></td><td class="num">${money(amount)}</td></tr></tfoot>
              </table>`
            : `<div class="note">Details could not be loaded for this order.</div>`
        }
      </section>`;
    })
    .join("");

  const range =
    dateFrom || dateTo
      ? ` · Expected delivery ${dateFrom || "…"} to ${dateTo || "…"}`
      : "";
  const generated = new Date().toLocaleString("en-IN");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>${esc(supplierName)} - Orders</title>
<style>
${REPORT_CSS}</style></head>
<body>
  <h1>${esc(supplierName)} — Purchase Orders</h1>
  <div class="sub">Filter: ${esc(FILTER_LABELS[filter] || filter)}${esc(range)} · Generated ${esc(generated)}</div>
  <div class="summary">
    <div>Orders<b>${orders.length}</b></div>
    <div>Total Qty<b>${grandQty}</b></div>
    <div>Total Amount<b>${money(grandAmount)}</b></div>
  </div>
  ${orderBlocks || `<p>No orders.</p>`}
</body></html>`;
}

// Product Details screen, before the order is placed: a report of the order
// being prepared - supplier, dates, remarks, and every size line with its
// qty, cost, GST, MRP and amount (cost x qty + GST). rows are the screen's
// pricing rows; brandByProduct maps product_id -> brand name.
export function buildOrderPreviewHtml({
  supplierName,
  poDate,
  expectedDeliveryDate,
  remarks,
  rows,
  brandByProduct,
}) {
  const lineAmount = (r) => {
    const base = Number(r.qty || 0) * Number(r.cost || 0);
    return base + (base * Number(r.gst || 0)) / 100;
  };
  const totalQty = rows.reduce((s, r) => s + Number(r.qty || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + lineAmount(r), 0);
  const sizeLabel = (r) =>
    [r.size_system, r.size_group, r.size_value].filter(Boolean).join(" ");

  const lineRows = rows
    .map(
      (r) => `<tr>
        <td>${esc(r.code)}</td>
        <td>${esc(r.name)}</td>
        <td>${esc(brandByProduct[r.product_id] || "—")}</td>
        <td>${esc([r.category_name, r.color_name].filter(Boolean).join(" | ") || "—")}</td>
        <td>${esc(sizeLabel(r))}</td>
        <td class="num">${esc(r.qty)}</td>
        <td class="num">${money(r.cost)}</td>
        <td class="num">${esc(Number(r.gst || 0))}%</td>
        <td class="num">${money(r.mrp)}</td>
        <td class="num">${money(lineAmount(r))}</td>
      </tr>`,
    )
    .join("");

  const generated = new Date().toLocaleString("en-IN");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>${esc(supplierName)} - Order (not yet placed)</title>
<style>${REPORT_CSS}</style></head>
<body>
  <h1>${esc(supplierName)} — Purchase Order (draft)</h1>
  <div class="sub">Not yet placed · Generated ${esc(generated)}</div>
  <div class="summary">
    <div>Lines<b>${rows.length}</b></div>
    <div>Total Qty<b>${totalQty}</b></div>
    <div>Total Amount<b>${money(totalAmount)}</b></div>
  </div>
  <section class="order">
    <table class="meta"><tr>
      <td><span>PO date</span>${esc(poDate || "—")}</td>
      <td><span>Expected delivery</span>${esc(expectedDeliveryDate || "—")}</td>
      <td><span>Supplier</span>${esc(supplierName)}</td>
    </tr></table>
    ${remarks ? `<div class="note">Remarks: ${esc(remarks)}</div>` : ""}
    <table class="grid">
      <thead><tr>
        <th>Product ID</th><th>Product Name</th><th>Brand</th><th>Variant</th><th>Size</th>
        <th class="num">Qty</th><th class="num">Cost</th><th class="num">GST</th><th class="num">MRP</th><th class="num">Amount</th>
      </tr></thead>
      <tbody>${lineRows || `<tr><td colspan="10">No sizes</td></tr>`}</tbody>
      <tfoot><tr>
        <td colspan="5">Total</td><td class="num">${totalQty}</td>
        <td></td><td></td><td></td><td class="num">${money(totalAmount)}</td>
      </tr></tfoot>
    </table>
  </section>
</body></html>`;
}
