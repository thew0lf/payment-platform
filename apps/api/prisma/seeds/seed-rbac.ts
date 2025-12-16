import { PrismaClient, ScopeType } from '@prisma/client';

const prisma = new PrismaClient();

// Default permissions organized by category
const DEFAULT_PERMISSIONS = [
  // Users
  { code: 'users:read', name: 'View Users', description: 'View user profiles and list users', category: 'users' },
  { code: 'users:write', name: 'Edit Users', description: 'Create and edit user profiles', category: 'users' },
  { code: 'users:delete', name: 'Delete Users', description: 'Delete or deactivate users', category: 'users' },
  { code: 'users:manage', name: 'Manage Users', description: 'Full user management including roles and permissions', category: 'users' },

  // Roles
  { code: 'roles:read', name: 'View Roles', description: 'View roles and permissions', category: 'roles' },
  { code: 'roles:write', name: 'Edit Roles', description: 'Create and edit roles', category: 'roles' },
  { code: 'roles:delete', name: 'Delete Roles', description: 'Delete roles', category: 'roles' },
  { code: 'roles:manage', name: 'Manage Roles', description: 'Full role management including permission assignment', category: 'roles' },

  // Transactions
  { code: 'transactions:read', name: 'View Transactions', description: 'View transaction history and details', category: 'transactions' },
  { code: 'transactions:write', name: 'Create Transactions', description: 'Process new transactions', category: 'transactions' },
  { code: 'transactions:refund', name: 'Process Refunds', description: 'Issue refunds and voids', category: 'transactions' },
  { code: 'transactions:manage', name: 'Manage Transactions', description: 'Full transaction management including disputes', category: 'transactions' },
  { code: 'transactions:export', name: 'Export Transactions', description: 'Export transaction data', category: 'transactions' },

  // Orders
  { code: 'orders:read', name: 'View Orders', description: 'View orders and order history', category: 'orders' },
  { code: 'orders:write', name: 'Create Orders', description: 'Create and edit orders', category: 'orders' },
  { code: 'orders:delete', name: 'Cancel Orders', description: 'Cancel and delete orders', category: 'orders' },
  { code: 'orders:manage', name: 'Manage Orders', description: 'Full order management', category: 'orders' },
  { code: 'orders:export', name: 'Export Orders', description: 'Export order data', category: 'orders' },

  // Products
  { code: 'products:read', name: 'View Products', description: 'View product catalog', category: 'products' },
  { code: 'products:write', name: 'Edit Products', description: 'Create and edit products', category: 'products' },
  { code: 'products:delete', name: 'Delete Products', description: 'Delete products', category: 'products' },
  { code: 'products:manage', name: 'Manage Products', description: 'Full product management including inventory', category: 'products' },
  { code: 'products:import', name: 'Import Products', description: 'Bulk import products', category: 'products' },
  { code: 'products:export', name: 'Export Products', description: 'Export product data', category: 'products' },

  // Customers
  { code: 'customers:read', name: 'View Customers', description: 'View customer profiles', category: 'customers' },
  { code: 'customers:write', name: 'Edit Customers', description: 'Create and edit customer profiles', category: 'customers' },
  { code: 'customers:delete', name: 'Delete Customers', description: 'Delete customer records', category: 'customers' },
  { code: 'customers:manage', name: 'Manage Customers', description: 'Full customer management', category: 'customers' },
  { code: 'customers:export', name: 'Export Customers', description: 'Export customer data', category: 'customers' },

  // Subscriptions
  { code: 'subscriptions:read', name: 'View Subscriptions', description: 'View subscription details', category: 'subscriptions' },
  { code: 'subscriptions:write', name: 'Edit Subscriptions', description: 'Create and modify subscriptions', category: 'subscriptions' },
  { code: 'subscriptions:cancel', name: 'Cancel Subscriptions', description: 'Cancel active subscriptions', category: 'subscriptions' },
  { code: 'subscriptions:manage', name: 'Manage Subscriptions', description: 'Full subscription management', category: 'subscriptions' },

  // Analytics
  { code: 'analytics:read', name: 'View Analytics', description: 'View reports and dashboards', category: 'analytics' },
  { code: 'analytics:export', name: 'Export Analytics', description: 'Export reports and data', category: 'analytics' },
  { code: 'analytics:manage', name: 'Manage Analytics', description: 'Configure reports and dashboards', category: 'analytics' },

  // Settings
  { code: 'settings:read', name: 'View Settings', description: 'View system settings', category: 'settings' },
  { code: 'settings:write', name: 'Edit Settings', description: 'Modify system settings', category: 'settings' },
  { code: 'settings:manage', name: 'Manage Settings', description: 'Full settings management', category: 'settings' },

  // Integrations
  { code: 'integrations:read', name: 'View Integrations', description: 'View integration configurations', category: 'integrations' },
  { code: 'integrations:write', name: 'Edit Integrations', description: 'Configure integrations', category: 'integrations' },
  { code: 'integrations:manage', name: 'Manage Integrations', description: 'Full integration management', category: 'integrations' },

  // Billing
  { code: 'billing:read', name: 'View Billing', description: 'View billing and invoices', category: 'billing' },
  { code: 'billing:write', name: 'Edit Billing', description: 'Modify billing settings', category: 'billing' },
  { code: 'billing:manage', name: 'Manage Billing', description: 'Full billing management', category: 'billing' },

  // Audit
  { code: 'audit:read', name: 'View Audit Logs', description: 'View audit trail and activity logs', category: 'audit' },
  { code: 'audit:export', name: 'Export Audit Logs', description: 'Export audit data', category: 'audit' },

  // Fulfillment
  { code: 'fulfillment:read', name: 'View Fulfillment', description: 'View shipments and fulfillment status', category: 'fulfillment' },
  { code: 'fulfillment:write', name: 'Process Fulfillment', description: 'Create and update shipments', category: 'fulfillment' },
  { code: 'fulfillment:manage', name: 'Manage Fulfillment', description: 'Full fulfillment management', category: 'fulfillment' },

  // Wildcard
  { code: '*', name: 'Super Admin', description: 'Full access to all features', category: 'admin' },
];

// Default system roles
const DEFAULT_ROLES = [
  {
    name: 'Platform Administrator',
    slug: 'platform_admin',
    description: 'Full platform access with all permissions',
    color: '#dc2626', // red-600
    scopeType: ScopeType.ORGANIZATION,
    isSystem: true,
    isDefault: false,
    priority: 1,
    permissions: ['*'],
  },
  {
    name: 'Client Administrator',
    slug: 'client_admin',
    description: 'Full access to client and all companies within',
    color: '#ea580c', // orange-600
    scopeType: ScopeType.CLIENT,
    isSystem: true,
    isDefault: false,
    priority: 10,
    permissions: [
      'users:manage', 'roles:manage',
      'transactions:manage', 'transactions:export',
      'orders:manage', 'orders:export',
      'products:manage', 'products:import', 'products:export',
      'customers:manage', 'customers:export',
      'subscriptions:manage',
      'analytics:manage', 'analytics:export',
      'settings:manage',
      'integrations:manage',
      'billing:manage',
      'audit:read', 'audit:export',
      'fulfillment:manage',
    ],
  },
  {
    name: 'Company Administrator',
    slug: 'company_admin',
    description: 'Full access to company resources',
    color: '#ca8a04', // yellow-600
    scopeType: ScopeType.COMPANY,
    isSystem: true,
    isDefault: false,
    priority: 20,
    permissions: [
      'users:manage', 'roles:read',
      'transactions:manage', 'transactions:export',
      'orders:manage', 'orders:export',
      'products:manage', 'products:import', 'products:export',
      'customers:manage', 'customers:export',
      'subscriptions:manage',
      'analytics:read', 'analytics:export',
      'settings:write',
      'integrations:read',
      'fulfillment:manage',
    ],
  },
  {
    name: 'Manager',
    slug: 'manager',
    description: 'Team management and operational access',
    color: '#16a34a', // green-600
    scopeType: ScopeType.COMPANY,
    isSystem: true,
    isDefault: false,
    priority: 30,
    permissions: [
      'users:read', 'users:write',
      'transactions:read', 'transactions:write', 'transactions:refund',
      'orders:read', 'orders:write',
      'products:read', 'products:write',
      'customers:read', 'customers:write',
      'subscriptions:read', 'subscriptions:write',
      'analytics:read',
      'fulfillment:read', 'fulfillment:write',
    ],
  },
  {
    name: 'Staff',
    slug: 'staff',
    description: 'Standard operational access',
    color: '#0284c7', // sky-600
    scopeType: ScopeType.COMPANY,
    isSystem: true,
    isDefault: true,
    priority: 40,
    permissions: [
      'transactions:read', 'transactions:write',
      'orders:read', 'orders:write',
      'products:read',
      'customers:read', 'customers:write',
      'subscriptions:read',
      'fulfillment:read',
    ],
  },
  {
    name: 'Viewer',
    slug: 'viewer',
    description: 'Read-only access',
    color: '#6b7280', // gray-500
    scopeType: ScopeType.COMPANY,
    isSystem: true,
    isDefault: false,
    priority: 50,
    permissions: [
      'transactions:read',
      'orders:read',
      'products:read',
      'customers:read',
      'subscriptions:read',
      'analytics:read',
      'fulfillment:read',
    ],
  },
];

async function seedRbac() {
  console.log('🔐 Seeding RBAC permissions and roles...');

  // Seed permissions
  console.log('  Creating permissions...');
  for (const perm of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        description: perm.description,
        category: perm.category,
      },
      create: perm,
    });
  }
  console.log(`  ✓ Created ${DEFAULT_PERMISSIONS.length} permissions`);

  // Seed roles
  console.log('  Creating system roles...');
  let platformAdminRole: { id: string } | null = null;

  for (const roleData of DEFAULT_ROLES) {
    const { permissions: permissionCodes, ...role } = roleData;

    // Create or update role
    const existingRole = await prisma.role.findFirst({
      where: {
        slug: role.slug,
        scopeType: role.scopeType,
        scopeId: null,
        deletedAt: null,
      },
    });

    let roleRecord;
    if (existingRole) {
      roleRecord = await prisma.role.update({
        where: { id: existingRole.id },
        data: {
          name: role.name,
          description: role.description,
          color: role.color,
          isSystem: role.isSystem,
          isDefault: role.isDefault,
          priority: role.priority,
        },
      });
    } else {
      roleRecord = await prisma.role.create({
        data: {
          name: role.name,
          slug: role.slug,
          description: role.description,
          color: role.color,
          scopeType: role.scopeType,
          isSystem: role.isSystem,
          isDefault: role.isDefault,
          priority: role.priority,
        },
      });
    }

    // Keep track of platform_admin role for user assignment
    if (role.slug === 'platform_admin') {
      platformAdminRole = roleRecord;
    }

    // Link permissions using upsert pattern (idempotent - safe to run multiple times)
    // Get existing permissions for this role
    const existingPermissions = await prisma.rolePermission.findMany({
      where: { roleId: roleRecord.id },
      select: { permissionId: true },
    });
    const existingPermissionIds = new Set(existingPermissions.map(p => p.permissionId));

    // Get all permissions we want to link
    const targetPermissions = await prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });
    const targetPermissionIds = new Set(targetPermissions.map(p => p.id));

    // Add missing permissions
    for (const permission of targetPermissions) {
      if (!existingPermissionIds.has(permission.id)) {
        await prisma.rolePermission.create({
          data: {
            roleId: roleRecord.id,
            permissionId: permission.id,
          },
        });
      }
    }

    // Remove permissions that are no longer needed (optional - keeps roles clean)
    for (const existing of existingPermissions) {
      if (!targetPermissionIds.has(existing.permissionId)) {
        await prisma.rolePermission.deleteMany({
          where: {
            roleId: roleRecord.id,
            permissionId: existing.permissionId,
          },
        });
      }
    }

    console.log(`  ✓ Created role: ${role.name} with ${permissionCodes.length} permissions`);
  }

  // Assign platform_admin role to existing SUPER_ADMIN and ADMIN users
  if (platformAdminRole) {
    console.log('  Assigning platform_admin to organization admins...');

    const adminUsers = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN'] },
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });

    for (const user of adminUsers) {
      if (!user.organizationId) continue;

      // Check if already has this role assignment
      const existingAssignment = await prisma.userRoleAssignment.findFirst({
        where: {
          userId: user.id,
          roleId: platformAdminRole.id,
          scopeType: ScopeType.ORGANIZATION,
          scopeId: user.organizationId,
        },
      });

      if (!existingAssignment) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: user.id,
            roleId: platformAdminRole.id,
            scopeType: ScopeType.ORGANIZATION,
            scopeId: user.organizationId,
          },
        });
        console.log(`    ✓ Assigned platform_admin to ${user.email}`);
      } else {
        console.log(`    - ${user.email} already has platform_admin`);
      }
    }
  }

  console.log('✅ RBAC seeding complete!');
}

// Run if called directly
if (require.main === module) {
  seedRbac()
    .catch((e) => {
      console.error('Error seeding RBAC:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedRbac, DEFAULT_PERMISSIONS, DEFAULT_ROLES };
