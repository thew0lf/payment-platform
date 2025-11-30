import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSION_MODE_KEY = 'permission_mode';

export type PermissionMode = 'all' | 'any';

/**
 * Decorator to require specific permissions on a route
 *
 * @example
 * // Require a single permission
 * @RequirePermissions('transactions:read')
 *
 * @example
 * // Require ALL permissions
 * @RequirePermissions('transactions:read', 'transactions:write')
 *
 * @example
 * // Require ANY permission
 * @RequirePermissions({ mode: 'any', permissions: ['admin:*', 'transactions:manage'] })
 */
export function RequirePermissions(
  ...permissionsOrConfig: string[] | [{ mode: PermissionMode; permissions: string[] }]
) {
  if (permissionsOrConfig.length === 1 && typeof permissionsOrConfig[0] === 'object') {
    const config = permissionsOrConfig[0] as { mode: PermissionMode; permissions: string[] };
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
      SetMetadata(PERMISSIONS_KEY, config.permissions)(target, propertyKey!, descriptor!);
      SetMetadata(PERMISSION_MODE_KEY, config.mode)(target, propertyKey!, descriptor!);
    };
  }

  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissionsOrConfig as string[])(target, propertyKey!, descriptor!);
    SetMetadata(PERMISSION_MODE_KEY, 'all' as PermissionMode)(target, propertyKey!, descriptor!);
  };
}

/**
 * Shorthand for requiring any of the listed permissions
 */
export function RequireAnyPermission(...permissions: string[]) {
  return RequirePermissions({ mode: 'any', permissions });
}

/**
 * Require admin-level access (wildcard permission)
 */
export function RequireAdmin() {
  return RequirePermissions('*');
}
