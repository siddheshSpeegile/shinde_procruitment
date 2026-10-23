export const isMobile = (v) => /^\d{10}$/.test(v);
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isGst = (v) => /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(v);
export const isPan = (v) => /^[A-Z]{5}\d{4}[A-Z]$/i.test(v);
export const isHex = (v) => /^#[0-9A-Fa-f]{6}$/.test(v);
