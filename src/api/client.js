import { API_BASE } from '../config';
import { pushAudit } from '../lib/audit';

// The only file that calls fetch. Unwraps Flask's { success, message, data } envelope and raises ApiError.
let getUser = () => null;
export const setUserProvider = (fn) => { getUser = fn; };
export const currentUserId = () => getUser()?.user_id ?? null;

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
  if (form) opts.body = form;
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }

  let res;
  try { res = await fetch(url, opts); }
  catch { throw new ApiError('Cannot reach the server. Check your internet and try again. If it keeps happening, tell the Administrator.', 0); }

  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  if (import.meta.env.DEV) console.debug(`[api] ${method} ${path} -> ${res.status}`, json);

  if (!res.ok || (json && json.success === false)) {
    throw new ApiError(json?.message || `Request failed (${res.status})`, res.status, json);
  }
  if (method !== 'GET') {
    // The sign-in request happens before anyone is signed in, so take the user from the typed username / the reply.
    const isLogin = path === '/auth/login';
    const u = getUser() || (isLogin ? json?.data : null);
    pushAudit({
      at: new Date().toISOString(),
      user: u?.username || (isLogin ? body?.username : null) || '-',
      role: u?.role_name || u?.role || null,
      user_id: u?.user_id ?? null,
      method, path, status: res.status, message: json?.message || '', body: form ? '(form upload)' : body,
    });
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
