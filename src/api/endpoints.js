import { api, withUser } from './client';

export const authApi = { login: (username, password) => api.post('/auth/login', { username, password }) };
export const healthApi = { check: () => api.get('/health') };
export const dashboardApi = { get: () => api.get('/dashboard') };

export const rolesApi = {
  list: () => api.get('/roles'),
  permissionsOf: (id) => api.get(`/roles/${id}/permissions`),
  allPermissions: () => api.get('/permissions'),
  save: (id, permission_ids) => api.put(`/roles/${id}/permissions`, { permission_ids }),
};

export const vendorsApi = {
  list: () => api.get('/vendors'),
  create: (b) => api.post('/vendors', withUser(b)),
  update: (id, b) => api.put(`/vendors/${id}`, withUser(b)),
  setStatus: (id, status) => api.patch(`/vendors/${id}/status`, withUser({ status })),
  uploadLogo: (id, file) => { const f = new FormData(); f.append('logo', file); return api.upload('PUT', `/vendors/${id}/logo`, f); },
};

/** One entry per lookup table. Same shape for list / create / update / status. */
export const MASTERS = {
  categories: { label: 'Category', plural: 'Categories', path: '/categories', idKey: 'category_id', nameKey: 'category_name', perm: 'category' },
  genders: { label: 'Gender', plural: 'Genders', path: '/genders', idKey: 'gender_id', nameKey: 'gender_name', perm: 'gender' },
  patterns: { label: 'Pattern', plural: 'Patterns', path: '/patterns', idKey: 'pattern_id', nameKey: 'pattern_name', perm: 'pattern' },
  colors: { label: 'Color', plural: 'Colors', path: '/colors', idKey: 'color_id', nameKey: 'color_name', perm: 'color', hasHex: true },
  sizes: { label: 'Size', plural: 'Sizes', path: '/sizes', idKey: 'size_id', nameKey: 'size_value', perm: 'size' },
  'gst-rates': { label: 'GST rate', plural: 'GST Master', path: '/gst-rates', idKey: 'gst_id', nameKey: 'gst_rate', perm: 'gst', isGst: true },
};
export const masterApi = (type) => {
  const M = MASTERS[type];
  return {
    list: () => api.get(M.path),
    create: (b) => api.post(M.path, withUser(b)),
    update: (id, b) => api.put(`${M.path}/${id}`, withUser(b)),
    setStatus: (id, status) => api.patch(`${M.path}/${id}/status`, withUser({ status })),
    usage: (id) => api.get(`${M.path}/${id}/usage`),
  };
};
export const colorHexApi = { resolve: (name) => api.get('/colors/hex', { name }) };
export const suggestionsApi = { get: (field) => api.get(`/suggestions/${field}`) };

export const productsApi = {
  listByVendor: (vendorId) => api.get('/products', { vendorId }),
  get: (id) => api.get(`/products/${id}`),
  create: (formData) => api.upload('POST', '/products', formData),
  update: (id, b) => api.put(`/products/${id}`, b),
  photos: (id) => api.get(`/products/${id}/photos`),
};

export const variantsApi = {
  list: (productId) => api.get('/variants', { productId }),
  get: (id) => api.get(`/variants/${id}`),
  createQuick: (b) => api.post('/variants/quick', b),
  sizes: (variantId) => api.get('/variant-sizes', { variantId }),
  assignSizes: (variant_id, size_ids) => api.post('/assign-sizes', { variant_id, size_ids }),
};

export const ordersApi = {
  list: (params) => api.get('/orders/all', params),
  get: (id) => api.get(`/orders/${id}`),
  create: (b) => api.post('/purchase-order', b),
  markDelivered: (id) => api.patch(`/orders/${id}/mark-delivered`, {}),
  setStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  setExpected: (id, expected_delivery_date) => api.patch(`/orders/${id}/expected-delivery-date`, { expected_delivery_date }),
  setPayment: (id, payment_status) => api.patch(`/orders/${id}/payment-status`, { payment_status }),
  lastPricing: (items) => api.post('/pricing/last-batch', { items }),
};

export const cartApi = {
  list: (vendorId) => api.get('/cart', { vendorId }),
  details: (vendorId) => api.get('/cart/details', { vendorId }),
};
