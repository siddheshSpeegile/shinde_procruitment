# Shinde Admin - Test Cases

Complements `TESTING.md` (quick tick-list). This file gives each case an ID, priority, steps and expected result so results can be tracked.

Priority: **P1** blocker / core flow, **P2** important, **P3** polish.
Status column: fill with Pass / Fail / Blocked and the bug reference.

## Test data needed

| Item | Detail |
| --- | --- |
| Users | `t_admin` (role Administrator), `t_buyer`, `t_viewer` (limited roles), `t_inactive` (status inactive) |
| Vendors | V1 active with logo, V2 active without logo, V3 inactive |
| Orders | O1 confirmed, due in future; O2 confirmed, past due date (delayed); O3 draft; O4 delivered; O5 dated next month; O6 paid + delivered |
| Products | One with 4 photos and 2 variants, one with 1 photo and no variants |
| Backend | Flask on :5000, Postgres restored, admin on :5173 |

---

## A. Dashboard screen (`/`)

Source: `GET /api/dashboard`, `src/pages/Dashboard.jsx`.

| ID | P | Scenario | Steps | Expected | Status |
| --- | --- | --- | --- | --- | --- |
| DB-01 | P1 | Page loads | Log in as admin | Spinner, then 5 KPI cards and "Pending orders" table; no console errors | |
| DB-02 | P1 | Pending orders KPI | Compare card with `SELECT COUNT(*) FROM purchase_order WHERE status <> 'delivered'` | Equal | |
| DB-03 | P1 | Order value pending | Compare with `SUM(psd.amount)` over orders where status <> 'delivered' | Equal (card shows whole rupees, en-IN grouping) | |
| DB-04 | P1 | Spend this month | Compare with `SUM(amount)` for orders with `order_date >= first of month` | Equal | |
| DB-05 | P1 | Vendors with pending orders | `COUNT(DISTINCT vendor_id)` for non-delivered orders | Equal; a vendor with only delivered orders is not counted | |
| DB-06 | P1 | Products on pending orders | `COUNT(DISTINCT product_id)` from `po_product_detail` joined to non-delivered orders | Equal; same product on two orders counts once | |
| DB-07 | P1 | Mark delivered updates dashboard | Note KPIs, mark O1 delivered, return to `/` | Orders -1, order value drops by O1 total, O1 leaves table, vendor/product counts drop if it was their last pending order | |
| DB-08 | P2 | Revert delivered | Set O4 status to Confirmed, reload | O4 appears in table, KPIs increase | |
| DB-09 | P2 | Payment does not affect KPIs | Mark O1 paid | Order value pending unchanged | |
| DB-10 | P2 | Table content | Inspect rows | Thumbnail, `PO-n` link, vendor, order date, expected date (or `-`), amount `₹x,xxx`, delivery pill | |
| DB-11 | P2 | PO link | Click `PO-n` | Opens `/purchase-orders/n` with matching data | |
| DB-12 | P2 | Delivery pill tones | View O1 (future) and O2 (past) | O1 info tone "on time"; O2 red tone "Delayed by n days" with correct day count | |
| DB-13 | P2 | Ordering and limit | Create more than 50 pending orders | Newest first by created date; at most 50 rows | |
| DB-14 | P2 | Empty state | Mark all orders delivered | KPIs show 0, table shows "No pending orders" | |
| DB-15 | P2 | Draft orders counted | Create or set an order to Draft | Draft is included in pending KPIs and table (backend treats anything not delivered as pending). Confirm this is intended | |
| DB-16 | P2 | Future-dated order in "Spend this month" | Order O5 dated next month | Backend query has no upper bound, so O5 is included in "this month". **Expected per card hint: excluded.** Log as bug if included | |
| DB-17 | P3 | Month boundary | On the 1st (or change server date), order dated last day of previous month | Excluded from spend; order dated 1st 00:00 included | |
| DB-18 | P3 | Count-up animation | Reload | Numbers animate from 0 to value in about 1s; final value exact; no flicker on re-render | |
| DB-19 | P3 | Large numbers | Order total over 1 crore | Formatted with Indian grouping (1,00,00,000); no overflow in card | |
| DB-20 | P3 | Order with no size lines | Order exists with no `po_size_detail` rows | Row shows `₹0`; KPIs unaffected | |
| DB-21 | P2 | Vendor with no logo / product with no photo | O-with V2 and photo-less product | Thumb shows fallback, no broken image | |
| DB-22 | P1 | API failure | Stop Flask, reload `/` | Error state with message and Try again; red API dot | |
| DB-23 | P1 | Recovery | Start Flask, click Try again | Dashboard loads without full page refresh | |
| DB-24 | P2 | Backend 500 | Break a table temporarily, or rename `po_size_detail` | "Failed to load dashboard" error state; no crash | |
| DB-25 | P3 | Responsive | Resize to 375, 768, 1440 px | KPI cards wrap (auto-fill 210px), table scrolls horizontally, no clipped content | |
| DB-26 | P3 | Dark mode | Toggle theme | All cards, pills, table readable; choice persists after refresh | |
| DB-27 | P2 | Stale data | Change an order from another tab, return to Dashboard tab | Data refreshes on navigation to `/` (verify; no auto-poll exists) | |

## B. Login and session

| ID | P | Scenario | Steps | Expected |
| --- | --- | --- | --- | --- |
| AU-01 | P1 | Valid login | Correct credentials | Lands on Dashboard, user shown in top bar |
| AU-02 | P1 | Wrong password | Valid user, wrong password | "Invalid password" |
| AU-03 | P1 | Unknown user | Random username | "User not found" |
| AU-04 | P1 | Inactive user | `t_inactive` | "User account is inactive" |
| AU-05 | P2 | Empty fields | Submit blank | Client message, no network request |
| AU-06 | P2 | Whitespace in username | " t_admin " | Defined behaviour (trim or reject); no 500 |
| AU-07 | P2 | Refresh keeps session | Refresh after login | Still signed in, permissions intact |
| AU-08 | P1 | Logout | Click sign out | Login page; `shinde_admin_session` removed from localStorage |
| AU-09 | P1 | Deep link while signed out | Open `/vendors` | Redirect to login, then back to `/vendors` after sign in |
| AU-10 | P2 | Login page when signed in | Visit `/login` | Redirected to `/` |
| AU-11 | P2 | Corrupt session | Set localStorage session to `{bad` | App loads to login, no white screen |
| AU-12 | P3 | Password show/hide | Toggle | Works |
| AU-13 | P3 | SQL injection strings | `' OR 1=1 --` as username | "User not found", no 500 |
| AU-14 | P2 | Double submit | Click Sign in twice quickly | One request or button disabled |

## C. Permissions and navigation

| ID | P | Scenario | Steps | Expected |
| --- | --- | --- | --- | --- |
| PM-01 | P1 | Admin sees all | Login `t_admin` | Every menu group present |
| PM-02 | P1 | Limited role menu | Login `t_viewer` | Only items whose `*.view` key the role has |
| PM-03 | P1 | Direct URL without permission | `t_viewer` opens a hidden route | "No access" page, not blank |
| PM-04 | P1 | Button gating | `t_viewer` on Vendors | No Add / Edit / Activate controls |
| PM-05 | P2 | Role with no mapping | User whose role name is not in `role` table | Note shown, menu empty or minimal, no crash |
| PM-06 | P2 | Change permissions | Admin removes `vendor.view` from role, Save; log in as that role | Vendors gone from menu |
| PM-07 | P2 | Unsaved changes guard | Edit permission checkboxes, navigate away | Confirmation prompt |
| PM-08 | P2 | Admin role locked | Open Administrator role | Boxes ticked and disabled |
| PM-09 | P2 | Open mode | `VITE_PERMISSION_MODE=open` | All screens visible for any role |
| PM-10 | P2 | Stale permissions | Change role permissions, do not re-login | Old keys until re-login or refresh (document behaviour) |
| PM-11 | P1 | **Security: API has no auth** | `curl -X PUT :5000/api/roles/1/permissions` with no login | Currently succeeds - log as known critical gap |
| PM-12 | P1 | **Security: tampered localStorage** | Edit stored session to `perms.all=true` | UI unlocks, but this is UI-only gating - log as known gap |

## D. Vendors

| ID | P | Scenario | Expected |
| --- | --- | --- | --- |
| VN-01 | P1 | List, search by name / code / GST, status filter | Correct filtering |
| VN-02 | P1 | Add with name only | Saves |
| VN-03 | P1 | Invalid mobile (9 digits), email, GST, PAN | Field errors, no request |
| VN-04 | P1 | Duplicate vendor code | Error toast |
| VN-05 | P2 | Two blank codes | Both save |
| VN-06 | P2 | Edit one field | Other fields unchanged after reload |
| VN-07 | P2 | Logo JPG / PNG | Avatar updates |
| VN-08 | P2 | Logo over 10 MB / non-image | Rejected client side |
| VN-09 | P1 | Deactivate | Confirm dialog, pill changes, vendor missing from Products and Refill Stock pickers |
| VN-10 | P2 | Reactivate | Back in pickers |
| VN-11 | P3 | Name with 255+ chars, unicode, `<script>` | Saved and displayed escaped, no layout break |
| VN-12 | P2 | Deactivate vendor with pending orders | Orders remain visible; dashboard still counts them (verify) |

## E. Masters (Categories, Genders, Patterns, Colors, Sizes, GST)

| ID | P | Scenario | Expected |
| --- | --- | --- | --- |
| MS-01 | P1 | List each master | Rows with status |
| MS-02 | P1 | Add valid / empty | Appears / field error |
| MS-03 | P2 | Add duplicate | Error toast (backend returns 500 - known gap; ideally 409) |
| MS-04 | P2 | Case-insensitive duplicate "Red" vs "red" | Defined behaviour |
| MS-05 | P2 | Edit then reload | Persisted |
| MS-06 | P2 | Deactivate / activate | Status changes; inactive value not offered in product/variant forms |
| MS-07 | P2 | Colors: hex `#12` | Rejected |
| MS-08 | P3 | Colors: swatch unticked | Saves empty hex |
| MS-09 | P2 | Sizes: `7.5`, `abc`, `-1`, `0` | Only whole numbers accepted |
| MS-10 | P2 | GST: 0, 18, 100 OK; 101, -1, text rejected | As stated |
| MS-11 | P2 | GST usage count | Equals order lines using that rate |
| MS-12 | P2 | Deactivate GST rate used by orders | Existing orders unaffected |
| MS-13 | P3 | Inactive size disappears from list (known gap) | Documented, cannot reactivate from UI |

## F. Products, variants, sizes

| ID | P | Scenario | Expected |
| --- | --- | --- | --- |
| PR-01 | P1 | Select vendor | Only active products with image, formatted price, variant count |
| PR-02 | P1 | Add without photo | "Add at least one photo" |
| PR-03 | P1 | 5 photos, PDF, 11 MB image | Each rejected |
| PR-04 | P1 | Add with 1 and with 4 photos | Saved; cover loads from `/api/product-photos/:id` |
| PR-05 | P1 | Duplicate vendor product ID (case / space variants) | "Product is already available" |
| PR-06 | P2 | Edit name, price, remarks | Persisted |
| PR-07 | P2 | Set Inactive | Leaves list; cannot be re-activated (known gap) |
| PR-08 | P3 | Negative / zero / non-numeric price | Rejected |
| PR-09 | P2 | Total request over 45 MB | Clean error, not a hang |
| VR-01 | P1 | Empty variants state | Empty message |
| VR-02 | P1 | Add variant with category + colour | Appears with "0 assigned" |
| VR-03 | P2 | Missing category or colour | Field errors |
| VR-04 | P2 | New colour name | Asks for swatch; known colour auto-fills |
| VR-05 | P1 | Assign sizes, save, reopen | Previous selection ticked |
| VR-06 | P2 | Deselect one size | Removed |
| VR-07 | P2 | Save with none selected | "At least one size" (backend rejects empty list) |

## G. Refill Stock (create order)

| ID | P | Scenario | Expected |
| --- | --- | --- | --- |
| RF-01 | P1 | No expected date | "Expected delivery date is required" |
| RF-02 | P1 | Expected before order date | Error |
| RF-03 | P1 | Variant with no sizes | Toast to assign sizes |
| RF-04 | P1 | Qty with cost 0; qty 2.5; all qty empty | Each errors |
| RF-05 | P2 | Prefill from last pricing | Cost / MRP / GST filled from previous order |
| RF-06 | P2 | Summary totals | Quantity and value update live and match saved order |
| RF-07 | P1 | Valid order | "PO-n created", detail page, status `confirmed`, rows in `purchase_order`, `po_product_detail`, `po_variant_detail`, `po_size_detail` |
| RF-08 | P2 | Load from cart | Lines built; cart empty after create |
| RF-09 | P2 | Network drop during submit | Error shown, no duplicate order on retry |
| RF-10 | P2 | Double click Create | Only one PO created |
| RF-11 | P1 | New order appears on Dashboard | Orders +1, value +total, vendor/product counts update |
| RF-12 | P3 | Very large quantity (1e9) | Rejected or handled without overflow |

## H. Purchase orders

| ID | P | Scenario | Expected |
| --- | --- | --- | --- |
| PO-01 | P1 | List and vendor filter | Correct rows |
| PO-02 | P1 | Filter Pending / Delayed / Delivered | Matches computed state |
| PO-03 | P2 | Date range, From after To | Warning; From only and To only both work, inclusive |
| PO-04 | P2 | Combined filters (AND) | Delayed AND in range |
| PO-05 | P1 | Detail matches SQL | Vendor, dates, qty, value |
| PO-06 | P1 | Change expected date to past | "Delayed by n days" and in Delayed filter |
| PO-07 | P1 | Status Draft / Confirmed / Delivered | Pill updates; leaving Delivered clears delivered date |
| PO-08 | P1 | Mark delivered | Confirm, "Delivered <date>", button gone; repeat call keeps original date |
| PO-09 | P2 | Mark paid / unpaid | Pill toggles; independent of delivery |
| PO-10 | P2 | Print | No menu or buttons |
| PO-11 | P2 | CSV | One row per size, opens in Excel, rupee and unicode intact |
| PO-12 | P2 | `/purchase-orders/99999` | Error with retry |
| PO-13 | P3 | Invalid date format in API | 400 with clear message |

## I. Cart and mocked screens

| ID | P | Scenario | Expected |
| --- | --- | --- | --- |
| CT-01 | P2 | Vendor with items | Image, code, variants, sizes shown |
| CT-02 | P2 | Empty cart | "This cart is empty" |
| CT-03 | P2 | Create order from cart | Opens Refill Stock prefilled |
| MK-01 | P2 | Users (mock) | CRUD works, banner says MOCK, persists in this browser only |
| MK-02 | P2 | Audit log | Each successful POST/PUT/PATCH logged with user, path, payload; GET not logged; Clear works |
| MK-03 | P2 | Audit log excludes failures | Failed request not logged |
| MK-04 | P2 | Reports vs Purchase Orders | Totals match |
| MK-05 | P3 | Hold List, Notifications, Settings | Placeholder banner |

## J. Cross-cutting

| ID | P | Scenario | Expected |
| --- | --- | --- | --- |
| XC-01 | P1 | Flask down | "Cannot reach the server", Try again, red dot |
| XC-02 | P1 | Postgres down, Flask up | Meaningful error; `/health/db` shows failed |
| XC-03 | P2 | Slow API (throttle to Slow 3G) | Spinner shown, no double submit |
| XC-04 | P2 | Escape closes drawers / dialogs, focus trapped | Yes |
| XC-05 | P2 | Keyboard-only navigation of login and a form | Possible, visible focus |
| XC-06 | P2 | Browsers: Chrome, Edge, Firefox, Safari | Same behaviour |
| XC-07 | P3 | Console clean on a full pass | No errors or React warnings |
| XC-08 | P2 | Lazy-loaded route chunk fails (offline) | Error boundary or message, not blank page |
| XC-09 | P2 | Production build | `npm run build` succeeds; `npm run preview` works with the proxy or API base set |
| XC-10 | P3 | Unknown URL `/foo` | Redirect to `/` |

## K. Backend API (Postman / curl / pytest)

| ID | P | Request | Expected |
| --- | --- | --- | --- |
| API-01 | P1 | `GET /api/health` | 200 `{"status":"healthy"}` |
| API-02 | P1 | `GET /health/db` | 200 connected |
| API-03 | P1 | `POST /api/auth/login` valid / invalid / missing field | 200 / 401 / 400 |
| API-04 | P1 | `GET /api/dashboard` | 200, keys `total_spend, vendors_count, products_count, orders_count, order_amount, recent_orders` |
| API-05 | P2 | Dashboard recent_orders item shape | `id, po, brand, image, date, expected_delivery_date, price, status, delivery{state,message}` |
| API-06 | P2 | `GET /api/orders/all?deliveryStatus=delayed&dateFrom=2026-09-01&dateTo=2026-09-30` | Filtered; bad date gives 400 |
| API-07 | P1 | `POST /api/purchase-order` missing `expected_delivery_date` / empty `products` | 400 |
| API-08 | P1 | `PATCH /api/orders/1/status` with `{"status":"approved"}` | 400 (only draft, confirmed, delivered) |
| API-09 | P2 | `PATCH /api/orders/99999/status` | 404 |
| API-10 | P2 | `PATCH payment-status` with value `maybe` | 400 |
| API-11 | P2 | Non-JSON body to a `@validate_json` route | 400 |
| API-12 | P2 | Concurrent requests (10 parallel `GET /api/dashboard`) | All 200, no "connection already closed" |
| API-13 | P2 | Decimal and date serialisation | Prices as strings, dates RFC 822 (panel normalises) |
| API-14 | P1 | **Security:** call any write endpoint with no credentials | Currently succeeds - known gap |
| API-15 | P1 | **Security:** `GET /api/auth/login` response | No password hash returned |
| API-16 | P2 | CORS preflight from an unlisted origin | Currently allowed (`CORS(app)`) - known gap |

---

## Suggested execution order

1. Section K API-01 to 04, then B (smoke).
2. A Dashboard, then G and H to generate and mutate data, re-checking A after each (DB-07, RF-11).
3. C with at least two roles.
4. D, E, F, I, J.
5. Security and known-gap cases (PM-11, PM-12, API-14, API-16) last; record as findings rather than failures.

## Notes on likely failures

- **DB-16:** the "this month" query is `order_date >= month_start` with no upper bound, so future-dated orders inflate Spend this month.
- **DB-15:** `status != 'delivered'` counts drafts as pending.
- **Dashboard 500s are opaque:** any exception returns the same generic message.
- **Timezone:** `datetime.now()` uses the server clock and zone; test near midnight on the 1st.
