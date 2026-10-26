# Shinde Admin Panel

React + Vite + Tailwind + Framer Motion + GSAP admin panel for the Flask + PostgreSQL procurement backend
(`siddheshSpeegile/shinde_procruitment`, `backend/`).

## Run it locally

Prerequisites: Node 18+, and the backend running on `http://localhost:5000` with your database restored.

```bash
# 1. Backend (from the repo root), either:
docker compose up db backend          # Postgres on 5432, Flask on 5000 (restore your DB dump first, see DOCKER_README.md)
# or natively:
cd backend && pip install -r requirements.txt && python app.py

# 2. Admin panel
cd shinde-admin
npm install
cp .env.example .env                  # Windows: copy .env.example .env
npm run dev                           # http://localhost:5173
```

The browser calls `/api/...` on port 5173 and Vite forwards it to Flask (`VITE_PROXY_TARGET`), so CORS is not involved.
The "API online" dot in the top bar calls `GET /api/health`. If it is red, fix that first.

Backend `.env` (in `backend/`): `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `DB_SCHEMA`, `SECRET_KEY`.
Apply `backend/migrations/001_*.sql` and `002_*.sql` if your database predates them (photos and vendor logos are stored in the database).

## Deploy on Render (free Static Site)

This panel lives on the `admin-panel` branch of the same GitHub repo as the mobile app and talks to the live backend (`https://shinde-procruitment.onrender.com`, built from the `backend/` folder on `main`).

1. Render dashboard > **New** > **Blueprint** > choose the repo and the `admin-panel` branch. It reads `render.yaml`.
   Manual alternative: **New** > **Static Site**, branch `admin-panel`, build command `npm ci && npm run build`, publish directory `dist`.
2. Environment: `VITE_API_BASE_URL=https://shinde-procruitment.onrender.com/api`, `NODE_VERSION=20`.
3. Redirects/Rewrites: `/*` rewrite to `/index.html` (already in `render.yaml`).
   If the site was created by hand (not from the Blueprint), add this rule yourself: Site > **Redirects/Rewrites** > Source `/*`, Destination `/index.html`, Action **Rewrite**. Without it, refreshing a page such as `/purchase-orders/5` shows "Not Found". `npm run build` also writes `dist/404.html` (a copy of `index.html`) as a backup for this.
4. Open the Render URL and sign in. The free backend sleeps when idle, so the first request can take up to a minute.

CORS is open on the backend, so no change is needed there. The API has no authentication of its own: share the panel link only with people you trust, and remember testers change the same data the mobile app uses.

## What is real and what is not

| Screen | Source |
| --- | --- |
| Login | `POST /api/auth/login` |
| Dashboard | `GET /api/dashboard` |
| Vendors, logo upload | `/api/vendors` |
| Categories, Genders, Patterns, Colors, Sizes, GST | `/api/{categories,genders,patterns,colors,sizes,gst-rates}` |
| Products | `GET/POST/PUT /api/products` (multipart photos) |
| Variants, size assignment | `/api/variants`, `/api/variants/quick`, `/api/variant-sizes`, `/api/assign-sizes` |
| Purchase Orders, detail, Refill Stock | `/api/orders/all`, `/api/orders/:id`, `/api/purchase-order`, status, delivery, payment endpoints |
| Cart | `GET /api/cart`, `/api/cart/details` (read only) |
| Roles & Permissions | `/api/roles`, `/api/permissions`, `PUT /api/roles/:id/permissions` |
| Reports | computed in the browser from `/api/orders/all` (placeholder formulas) |
| **MOCK** Users | browser storage only, no backend endpoint |
| **MOCK** Audit Logs | every successful write this browser sends, kept in browser storage |
| **MOCK** Hold List, Notifications, Settings | no backend endpoint, placeholder screens |

## How permissions work

`POST /api/auth/login` returns `{user_id, username, email, role, photo_url}` and no token or permissions. After login the panel:

1. Reads `GET /api/roles`, finds the row whose name matches the user's `role`.
2. Reads `GET /api/roles/:id/permissions` and keeps the `permission_key` values.
3. Shows a menu item or button only if the key exists. A role named `Administrator` always gets everything.

The keys the panel asks for are listed in `src/router/routes.jsx` and in `can`/`<Can perm>` calls (`vendor.view`, `vendor.create`, `vendor.edit`, `vendor.activate`, `purchase_order.view`, and so on).
Your permission table may use different keys. Open **Roles & Permissions** to see the real ones for your session and for every role, then adjust the strings.
Set `VITE_PERMISSION_MODE=open` to bypass checks while you verify connectivity.

This is UI gating only. The Flask API has no authentication, so anyone who can reach port 5000 can call every endpoint.

## Backend gaps found while connecting

1. No token or session on the API, and no permission checks on any route.
2. Order statuses are `draft`, `confirmed`, `delivered` (DB CHECK constraint). The approval workflow from the prototype (pending approval, approved, rejected) is not built. New orders are saved as `confirmed`.
3. `GET /api/products` returns active products only and there is no re-activate path. `PUT /api/products/:id` requires `photo_url`; photos cannot be edited after creation.
4. `GET /api/sizes` and `GET /api/variants` return active rows only. There is no variant edit or status endpoint. `POST /api/assign-sizes` rejects an empty list, so all sizes cannot be removed from a variant.
5. Duplicate names on create (category, colour, size and so on) come back as HTTP 500 with a generic message.
6. `PATCH /orders/:id/*` and `POST /purchase-order` do not record who made the change.
7. `GET /api/cart` needs a `vendorId`; there is no hold list, user, audit, notification, settings or report endpoint.
8. Decimal columns (price, cost, mrp, amount) are serialised as strings and dates as RFC 822 text. The panel normalises both in `src/lib/format.js`.

See `TESTING.md` for the test checklist.
