const env = import.meta.env;

export const API_BASE = (env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export const PERMISSION_MODE = env.VITE_PERMISSION_MODE || 'backend';
export const MOCK_USERS = env.VITE_MOCK_USERS !== 'false';
export const MOCK_HOLD_LIST = env.VITE_MOCK_HOLD_LIST !== 'false';

// Image paths from the DB look like /api/product-photos/12 (relative to the server root).
// Through the Vite proxy the relative path works as-is; with an absolute API base, prefix its origin.
export function resolveImage(path) {
  if (!path) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  if (/^https?:\/\//i.test(API_BASE)) return new URL(API_BASE).origin + (path.startsWith('/') ? path : '/' + path);
  return path.startsWith('/') ? path : '/' + path;
}
