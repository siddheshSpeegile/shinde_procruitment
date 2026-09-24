// // Replace with your machine's actual LAN IP (run `ipconfig` on Windows,
// // look for IPv4 Address under your WiFi adapter - NOT 127.0.0.1/localhost).
// const LOCAL_IP = "192.168.1.42";

// export const API_BASE_URL = __DEV__
//   ? `http://${LOCAL_IP}:5000/api`
//   : "https://your-deployed-backend.onrender.com/api"; // for production builds later

// export async function apiFetch(path: string, options: RequestInit = {}) {
//   const res = await fetch(`${API_BASE_URL}${path}`, {
//     headers: { "Content-Type": "application/json", ...(options.headers || {}) },
//     ...options,
//   });
//   return res.json();
// }

// Replace with your machine's actual LAN IP (run `ipconfig` on Windows,
// look for IPv4 Address under your WiFi adapter - NOT 127.0.0.1/localhost).
// When using `adb reverse tcp:5000 tcp:5000` (USB-connected Android device),
// the phone treats your PC's port 5000 as its own localhost - use this
// instead of the LAN IP in that case.
const LOCAL_IP = "10.154.245.172";

// EXPO_PUBLIC_* env vars are inlined by Expo at build/start time (see
// docker-compose.yml's `frontend` service, or a local .env file) - this
// lets the backend URL be set from outside the code, e.g. when running
// via Docker, without editing this file. Falls back to the hardcoded
// LOCAL_IP above for local `npx expo start` with no env var set.
export const API_BASE_URL = __DEV__
  ? process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:5000/api`
  : "https://shinde-procruitment.onrender.com/api"; // for production builds later

// Server root without the trailing /api - image paths stored in the DB are
// relative to this (e.g. /api/product-photos/12, or legacy
// /uploads/products/abc.jpeg), not to API_BASE_URL.
export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

// The DB stores photo_url as a relative path ("/api/product-photos/12") so it
// keeps working when the LAN IP or backend host changes. <Image> needs a full
// URL though, so prefix the current server here at display time.
// Already-absolute URIs (http(s)://, local file:// picks) pass through as-is.
export function resolveImageUrl(path) {
  if (!path) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  return `${SERVER_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  return res.json();
}
