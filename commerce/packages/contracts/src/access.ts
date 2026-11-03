/**
 * Roles and permissions (Section 08 RBAC matrix). Staff accounts need MFA. CUSTOMER is the shopper role; customers
 * never get staff permissions. MARKETING extends the matrix for the shared back office (coupons, affiliates, sales).
 */
export const STAFF_ROLES = ['OWNER', 'SUPPORT', 'CATALOG_MANAGER', 'FULFILLMENT', 'FINANCE', 'MARKETING'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type Role = StaffRole | 'CUSTOMER';

export const PERMISSIONS = {
  'overview.read': ['OWNER', 'SUPPORT', 'CATALOG_MANAGER', 'FULFILLMENT', 'FINANCE', 'MARKETING'],
  'catalogue.read': ['OWNER', 'SUPPORT', 'CATALOG_MANAGER', 'FULFILLMENT', 'FINANCE', 'MARKETING'],
  'catalogue.write': ['OWNER', 'CATALOG_MANAGER'],
  'catalogue.publish': ['OWNER', 'CATALOG_MANAGER'],
  'inventory.adjust': ['OWNER', 'CATALOG_MANAGER', 'FULFILLMENT'],
  'certificates.write': ['OWNER', 'CATALOG_MANAGER'],
  'orders.read': ['OWNER', 'SUPPORT', 'FULFILLMENT', 'FINANCE'],
  'orders.fulfill': ['OWNER', 'FULFILLMENT'],
  'orders.cancel': ['OWNER', 'SUPPORT', 'FINANCE'],
  'refunds.write': ['OWNER', 'FINANCE'],
  'returns.write': ['OWNER', 'SUPPORT', 'FULFILLMENT'],
  'requests.read': ['OWNER', 'SUPPORT'],
  'requests.write': ['OWNER', 'SUPPORT'],
  'quotes.write': ['OWNER', 'SUPPORT'],
  'cms.write': ['OWNER', 'CATALOG_MANAGER', 'MARKETING'],
  'marketing.write': ['OWNER', 'MARKETING'],
  'reports.read': ['OWNER', 'FINANCE'],
  'settings.read': ['OWNER', 'FINANCE'],
  'settings.write': ['OWNER'],
  'payments.mode': ['OWNER'],
  'staff.manage': ['OWNER'],
  'audit.read': ['OWNER'],
} as const satisfies Record<string, readonly StaffRole[]>;
export type Permission = keyof typeof PERMISSIONS;

export const can = (role: Role, permission: Permission): boolean => role !== 'CUSTOMER' && (PERMISSIONS[permission] as readonly string[]).includes(role);
