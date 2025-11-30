import { UserRole, UserStatus, ScopeType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// USER TYPES
// ═══════════════════════════════════════════════════════════════

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  scopeType: ScopeType;
  scopeId: string;
  organizationId: string | null;
  clientId: string | null;
  companyId: string | null;
  departmentId: string | null;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Computed/joined fields
  organizationName?: string;
  clientName?: string;
  companyName?: string;
  departmentName?: string;
  roleAssignments?: UserRoleAssignment[];
}

export interface UserRoleAssignment {
  id: string;
  roleId: string;
  roleName: string;
  roleSlug: string;
  roleColor: string | null;
  scopeType: ScopeType;
  scopeId: string;
  scopeName?: string;
  assignedAt: Date;
  expiresAt: Date | null;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pending: number;
}

export { UserRole, UserStatus, ScopeType };
