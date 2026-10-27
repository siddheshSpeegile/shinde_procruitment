import { API_BASE } from '../config';

// The only file that calls fetch. Unwraps Flask's { success, message, data } envelope and raises ApiError.
let getUser = () => null;
export const setUserProvider = (fn) => { getUser = fn; };
// Screens can make their first requests (for example the notification bell) before the sign-in provider above is
// registered, so fall back to the saved session. Without it those requests run with no user.
const savedSession = () => { try { return JSON.parse(localStorage.getItem('shinde_admin_session')); } catch { return null; } };
const whoAmI = () => getUser() || savedSession()?.user || null;
// Login token, sent on every request.
let getToken = () => null;
export const setTokenProvider = (fn) => { getToken = fn; };
const currentToken = () => getToken() || savedSession()?.token || null;
export const currentUserId = () => whoAmI()?.user_id ?? null;

export class ApiError extends Error {
  constructor(message, status, body) { super(message); this.status = status; this.body = body; }
}

async function request(method, path, { body, form, params } = {}) {
  let url = API_BASE + path;
  if (params) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') q.set(k, v); });
    const s = q.toString();
    if (s) url += (url.includes('?') ? '&' : '?') + s;
  }
  const opts = { method, headers: {} };
  // Every request carries the login token (the server requires sign-in for the whole API) and a label for the Audit Log.
  const sentToken = path !== '/auth/login' && currentToken();
  if (sentToken) opts.headers.Authorization = `Bearer ${sentToken}`;
  opts.headers['X-Client'] = 'panel';
  if (form) opts.body = form;
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }

  let res;
  try { res = await fetch(url, opts); }
  catch { throw new ApiError('Cannot reach the server. Check your internet and try again. If it keeps happening, tell the Administrator.', 0); }

  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  if (import.meta.env.DEV) console.debug(`[api] ${method} ${path} -> ${res.status}`, json);

  if (res.status === 401 && sentToken && path !== '/auth/login') window.dispatchEvent(new Event('auth:expired')); // token expired or account switched off
  if (!res.ok || (json && json.success === false)) {
    throw new ApiError(json?.message || `Request failed (${res.status})`, res.status, json);
  }
  return json && 'data' in json ? json.data : json;
}

export const api = {
  get: (p, params) => request('GET', p, { params }),
  post: (p, body) => request('POST', p, { body }),
  put: (p, body) => request('PUT', p, { body }),
  patch: (p, body) => request('PATCH', p, { body }),
  del: (p, body) => request('DELETE', p, { body }),
  upload: (method, p, form) => request(method, p, { form }),
};

// Adds the signed-in user's id to writes; Flask stores it in updated_by.
export const withUser = (b) => ({ ...b, updated_by: currentUserId() });
