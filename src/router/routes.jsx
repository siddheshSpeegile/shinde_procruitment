import { lazy } from 'react';

// menu: false = the screen still works by URL but is not listed in the sidebar.
// perm = permission_key a user's role must have. Keys follow module.action; compare with the
// "Roles & Permissions" screen, which lists the keys that actually exist in your permission table.
const L = (f) => lazy(f);

export const ROUTES = [
  { path: '/', label: 'Dashboard', group: 'Overview', perm: 'dashboard.view', el: L(() => import('../pages/Dashboard')) },
  { path: '/suppliers', label: 'Suppliers', group: 'Catalogue', perm: 'vendor.view', el: L(() => import('../pages/Vendors')) },
  { path: '/products', label: 'Products', group: 'Catalogue', perm: 'product.view', el: L(() => import('../pages/Products')) },
  { path: '/products/:productId/variants', perm: 'variant.view', el: L(() => import('../pages/Variants')) },
  { path: '/masters/categories', label: 'Categories', group: 'Masters', perm: 'category.view', el: L(() => import('../pages/Masters')) },
  { path: '/masters/genders', label: 'Genders', group: 'Masters', perm: 'gender.view', el: L(() => import('../pages/Masters')) },
  { path: '/masters/colors', label: 'Colors', group: 'Masters', perm: 'color.view', el: L(() => import('../pages/Masters')) },
  { path: '/masters/sizes', label: 'Sizes', group: 'Masters', perm: 'size.view', el: L(() => import('../pages/Masters')) },
  { path: '/masters/gst-rates', label: 'GST Master', group: 'Masters', perm: 'gst.view', el: L(() => import('../pages/Masters')) },
  { path: '/purchase-orders', label: 'Purchase Orders', group: 'Procurement', perm: 'purchase_order.view', el: L(() => import('../pages/Orders')) },
  { path: '/purchase-orders/:id', perm: 'purchase_order.view', el: L(() => import('../pages/OrderDetail')) },
  { path: '/purchase-orders/:id/edit', perm: 'purchase_order.create', el: L(() => import('../pages/CreateOrder')) },
  { path: '/cut-order/new', label: 'Cut Order', group: 'Procurement', perm: 'purchase_order.create', el: L(() => import('../pages/CreateOrder')) },
  { path: '/cart', label: 'Cart', group: 'Procurement', perm: 'cart.view', el: L(() => import('../pages/Cart')) },
  { path: '/hold-list', label: 'Hold List', group: 'Procurement', menu: false, perm: 'hold_list.view', el: L(() => import('../pages/HoldList')) },
  { path: '/users', label: 'Users', group: 'Users & Security', perm: 'user.view', el: L(() => import('../pages/Users')) },
  { path: '/roles', label: 'Roles & Permissions', group: 'Users & Security', perm: 'role.view', el: L(() => import('../pages/Roles')) },
  { path: '/reports', label: 'Reports', group: 'Insights', menu: false, perm: 'report.view', el: L(() => import('../pages/Reports')) },
  { path: '/audit-logs', label: 'Audit Logs', group: 'Insights', perm: 'audit_log.view', el: L(() => import('../pages/Audit')) },
  { path: '/notifications', label: 'Notifications', group: 'System', perm: 'notification.view', el: L(() => import('../pages/Notifications')) },
  { path: '/settings', label: 'Settings', group: 'System', menu: false, perm: 'settings.view', el: L(() => import('../pages/Placeholder')) },
];
