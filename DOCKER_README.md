# Running Shinde Procurement with Docker

## Important: what this does and doesn't do

Docker packages your **backend (Flask) and database (Postgres)** so anyone
can run them with one command, instead of installing Python/Postgres
locally. It can optionally also run the **Expo dev server** so a teammate
gets a QR code without installing Node.

**Docker does NOT turn the mobile app into something people install on
their phones.** That's a separate thing entirely - the phone still needs
either the Expo Go app (for development) or a real build via EAS Build
(for a standalone/App Store app). Docker just makes the _server side_
trivial to stand up.

## Setup

1. Copy `.env.example` to `.env` and fill in real values:
   ```
   cp .env.example .env
   ```
2. There's no `db-init/` auto-restore folder - restore your schema dump
   into the database the same way you already do (pg_restore / pgAdmin),
   just pointed at `localhost:5432` once the `db` container is running,
   instead of a natively-installed Postgres. Nothing about your restore
   workflow changes.

## Running the backend + database only (the common case)

```
docker compose up db backend
```

- Postgres comes up empty. Restore your schema dump into it yourself,
  the same way you always have - it's listening on `localhost:5432`
  same as a native install would be.
- The backend waits for Postgres to report healthy, then starts on
  `http://localhost:5000`.
- To point your existing local Expo app at this instead of your
  locally-run Flask server: edit `LOCAL_IP` in `frontend/api/config.js`
  to your PC's LAN IP (Docker Desktop exposes the container's port 5000
  on your host, so this works exactly like running `python app.py`
  directly did before).

**To wipe the database and start completely fresh:**
`docker compose down -v` (this deletes all data, including anything
uploaded through the app), then `docker compose up` and restore your
dump again.

## Also running the Expo dev server in a container (optional)

```
docker compose up frontend
```

- Watch the logs (`docker compose logs -f frontend`) for the QR code,
  same as running `npx expo start` locally.
- Uses `--tunnel` mode deliberately, not the default LAN mode: a phone
  on your Wi-Fi can't reach a container's network directly (Docker's
  NAT blocks it), so this routes through Expo's own relay instead. It's
  slower than LAN mode and needs internet access, but works regardless
  of Docker's networking.
- Set `API_URL` in `.env` to your PC's actual LAN IP + `:5000/api` -
  this becomes `EXPO_PUBLIC_API_URL` inside the container, which
  `api/config.js` now reads automatically (falls back to the hardcoded
  `LOCAL_IP` if unset, so nothing breaks for your normal local workflow).

## Sharing this with someone else

Send them this whole project folder (or a Git repo). They run:

```
cp .env.example .env    # fill in values
docker compose up
```

and get a working backend + database without installing Python or
Postgres. For the mobile app itself, they still need Expo Go on their
phone and to scan the QR code from the `frontend` container's logs (or
run `npx expo start` locally themselves, pointed at your backend's URL).

## Production deployment

For an actual production deployment (not just local sharing), you'd
typically:

- Push these images to a registry and run them on a real server/VPS
- Set `FLASK_ENV=production` and a real random `SECRET_KEY` (already
  the defaults in `.env.example` - just change `SECRET_KEY`)
- Put the backend behind a reverse proxy (nginx/Caddy) with HTTPS
- Update `API_BASE_URL`'s production branch in `frontend/api/config.js`
  to that real HTTPS URL, then build the app for real via `eas build`

That last step is outside Docker's scope entirely - it's the EAS Build /
Apple Developer Account path discussed earlier for getting the app onto
actual devices or app stores.
