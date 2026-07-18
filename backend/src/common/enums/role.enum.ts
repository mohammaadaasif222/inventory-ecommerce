export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  VENDOR = 'VENDOR',
  CUSTOMER = 'CUSTOMER',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
}

/** Roles that may access the admin panel. */
export const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];
