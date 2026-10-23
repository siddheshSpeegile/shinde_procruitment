# Test checklist

Tick each box as you go. "Expect" lines say what should happen. Anything that fails: note the screen, the request in the browser Network tab (filter `api`), and the message in Flask's console.

## 0. Setup

- [ ] `GET http://localhost:5000/api/health` returns `{"status":"healthy"}`; `GET /health/db` returns `connected`.
- [ ] `npm run dev` starts; top bar shows a green **API online** dot after login.
- [ ] Create the admin test user. Registration makes a user with role `user`. The `"User".role` column has a CHECK constraint (`User_role_check`) that only allows `admin` or `user`; the real role link is `role_id`:

```bash
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"username":"t_admin","password":"Test@123","email":"t_admin@example.com"}'
```
```sql
SELECT role_id, role_name FROM role;                          -- 1 = Administrator
UPDATE "User" SET role = 'admin', role_id = 1 WHERE username = 't_admin';
```

- [ ] Limited roles (Buyer = 3, Viewer = 5, ...): `UPDATE "User" SET role_id = 5 WHERE username = 't_viewer';`. Known gap: the panel matches `"User".role` against `role.role_name`, and the column cannot hold role names, so non-admin users show "role not found" and an empty menu. Fixing it needs the login response to return `role_id` (or the role name) and the panel to use it.

## 1. Login and session

- [ ] Wrong password: red message "Invalid password". Unknown user: "User not found". Inactive user: "User account is inactive".
- [ ] Empty fields: "Enter your username and password." and no request is sent.
- [ ] Valid login lands on Dashboard. Refresh keeps you signed in. Sign out returns to Login.
- [ ] Opening `/vendors` while signed out redirects to Login, then returns to `/vendors` after sign in.
- [ ] Show/Hide password works. Light/dark toggle persists after refresh.

## 2. Permissions (repeat per role)

- [ ] Open **Roles & Permissions**. "Your session" lists the keys for the signed-in role.
- [ ] Menu shows only screens whose `*.view` key the role has.
- [ ] Typing a URL the role cannot see shows "No access", not a blank page.
- [ ] Buttons for create, edit, activate are hidden when the key is missing.
- [ ] If every non-admin role sees an empty menu, the permission keys in the DB differ from the panel's. Compare keys on the Roles screen and edit `src/router/routes.jsx` and the `<Can perm>` strings.
- [ ] Administrator role shows "locked" and all boxes are ticked and disabled.
- [ ] Change a role's permissions, Save. Sign in as that role again and confirm the menu changed. Leaving the screen with unsaved changes asks first.

## 3. Dashboard

- [ ] KPI numbers match SQL: pending orders = `SELECT COUNT(*) FROM purchase_order WHERE status <> 'delivered'`.
- [ ] Spend this month matches `SUM(amount)` for orders dated this month.
- [ ] Pending orders table shows cover image, PO, vendor, delivery message. PO link opens the detail.
- [ ] Mark an order delivered (section 9) and reload: it leaves the table and KPIs drop.

## 4. Vendors

- [ ] List loads; search by name, code, GST; status filter works.
- [ ] Add with only a name: saves. Add with a bad mobile (9 digits), bad email, bad GST, bad PAN: each shows a field error and nothing is sent.
- [ ] Duplicate vendor code: error toast "Failed to create vendor - check vendor_code isn't already in use".
- [ ] Two vendors with a blank code both save.
- [ ] Edit changes only the fields edited (other fields keep their values after reload).
- [ ] Upload a JPG logo: avatar appears. A PNG works. A file over 10 MB is rejected in the browser.
- [ ] Deactivate asks for confirmation; status pill changes; vendor disappears from the Products and Refill Stock vendor pickers. Activate reverses it.

## 5. Masters (Categories, Genders, Patterns, Colors, Sizes, GST)

For each master:
- [ ] List shows existing rows with status.
- [ ] Add valid value: appears in list. Add empty: field error.
- [ ] Add a duplicate: error toast (backend returns 500; known gap).
- [ ] Edit name; reload to confirm.
- [ ] Deactivate and Activate (Sizes: see gap, an inactive size disappears from the list).

Extra checks:
- [ ] Colors: swatch shows; hex `#12` rejected; "Set a swatch colour" unticked saves an empty hex.
- [ ] Sizes: only whole numbers accepted.
- [ ] GST: 0 to 100 accepted; 101 and text rejected; **Usage** shows the number of order lines using that rate.

## 6. Products

- [ ] Choose a vendor; its active products list with image, price (₹ formatted), variant count.
- [ ] Add product with no photo: "Add at least one photo." With 5 photos: rejected. With a PDF: rejected. With an 11 MB image: rejected.
- [ ] Add with 1 to 4 JPG/PNG photos: product appears; cover photo loads from `/api/product-photos/:id`.
- [ ] Same vendor product ID twice (also with different case or spaces): error "Product is already available".
- [ ] Edit name, price, customer ID, remarks; reload to confirm. Status set to Inactive removes it from the list.
- [ ] The customer ID field suggests existing values.

## 7. Variants and sizes

- [ ] Open a product's variants link. Empty state shows when there are none.
- [ ] Add variant: category and colour suggestions appear. A new colour name asks for a swatch colour; a known name shows its swatch automatically.
- [ ] Missing category or colour: field error.
- [ ] New variant shows "0 assigned". **Assign sizes**: choose sizes, Save; count updates. Re-open: previous selection is ticked. Deselect one and save: it is removed.
- [ ] Saving with nothing selected shows the "at least one size" message.

## 8. Refill Stock (create order)

- [ ] Pick vendor, order date today, no expected date: **Create order** lists "Expected delivery date is required."
- [ ] Expected date before order date: error.
- [ ] Add product, add a variant with assigned sizes: size rows appear with prices pre-filled from the last order when one exists.
- [ ] Variant with no sizes: toast asks you to assign sizes first.
- [ ] Quantity with cost 0: error. Quantity 2.5: error. All quantities empty: error.
- [ ] Summary quantity and value update as you type.
- [ ] Valid order: toast "PO-n created", lands on the detail page. Check in SQL: one `purchase_order` row with status `confirmed`, matching `po_product_detail`, `po_variant_detail`, `po_size_detail` rows.
- [ ] Add items to a vendor's cart in the mobile app, then use **Load from cart**: lines are built; after creating the order the cart is empty.

## 9. Purchase Orders

- [ ] List: filter by vendor, by Pending / Delayed / Delivered, by due date range. From date after To date shows a warning.
- [ ] Detail page: vendor, dates, quantity and value match SQL; sizes grouped by product and variant.
- [ ] **Change expected date** to a past date on a pending order: delivery pill shows "Delayed by n days"; it also appears under the Delayed filter.
- [ ] **Change status** to Draft, Confirmed, Delivered: pill updates. Moving away from Delivered clears the delivered date.
- [ ] **Mark delivered** asks to confirm, then shows "Delivered <date>"; the button disappears.
- [ ] **Mark paid / unpaid** toggles the payment pill.
- [ ] **Print** gives a clean page without menu or buttons. **Download CSV** opens in Excel with one row per size.
- [ ] `/purchase-orders/99999` shows an error with a retry button.

## 10. Cart

- [ ] Choose a vendor with items from the mobile app: image, code, variant count and sizes show.
- [ ] Empty vendor: "This cart is empty".
- [ ] **Create order from cart** opens Refill Stock with the lines loaded.

## 11. Mocked screens

- [ ] Users: add, edit, deactivate; banner says MOCK; data survives refresh and stays in this browser.
- [ ] Audit Logs: after steps above each POST, PUT, PATCH shows with user and path; **Details** shows the payload; Clear log empties it.
- [ ] Reports: totals by state and vendor match Purchase Orders.
- [ ] Hold List, Notifications, Settings: banner explains the missing endpoint.

## 12. Cross-cutting

- [ ] Stop Flask: any screen shows "Cannot reach the server" with a Try again button; red API dot.
- [ ] Restart Flask, press Try again: data returns.
- [ ] Drawers and dialogs close with Escape; Tab order stays inside them.
- [ ] Dark mode: tables, drawers, pills and the order form stay readable.
- [ ] Browser console shows no errors during a normal pass.
