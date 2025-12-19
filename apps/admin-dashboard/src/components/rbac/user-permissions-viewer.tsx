'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Shield, ShieldCheck, Users, Key } from 'lucide-react';
import { getUserEffectivePermissions, EffectivePermissions, ScopeType, PERMISSION_CATEGORIES } from '@/lib/api/rbac';

interface UserPermissionsViewerProps {
  userId: string;
  userName?: string;
  userEmail?: string;
  scopeType: ScopeType;
  scopeId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal to view a user's effective permissions.
 * Shows all permissions computed from roles and direct grants.
 */
export function UserPermissionsViewer({
  userId,
  userName,
  userEmail,
  scopeType,
  scopeId,
  isOpen,
  onClose,
}: UserPermissionsViewerProps) {
  const [permissions, setPermissions] = useState<EffectivePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPermissions = useCallback(async () => {
    if (!userId || !scopeType || !scopeId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserEffectivePermissions(userId, scopeType, scopeId);
      setPermissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  }, [userId, scopeType, scopeId]);

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
  }, [isOpen, loadPermissions]);

  // Group permissions by category (permissions are strings like "users:read")
  const groupedPermissions = React.useMemo(() => {
    if (!permissions) return new Map<string, string[]>();
    const grouped = new Map<string, string[]>();
    for (const perm of permissions.permissions) {
      if (perm === '*') continue; // Handle wildcard separately
      const [category] = perm.split(':');
      const existing = grouped.get(category) || [];
      grouped.set(category, [...existing, perm]);
    }
    return grouped;
  }, [permissions]);

  // Filter permissions by search
  const filteredCategories = Array.from(groupedPermissions.entries()).filter(([category, perms]) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      category.toLowerCase().includes(query) ||
      perms.some((p: string) => p.toLowerCase().includes(query))
    );
  });

  const totalPermissions = permissions?.permissions.length || 0;
  const hasWildcard = permissions?.permissions.includes('*');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            User Permissions
          </DialogTitle>
          <DialogDescription>
            Effective permissions for {userName || userEmail || userId}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
          </div>
        ) : permissions ? (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Total Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{totalPermissions}</span>
                    {hasWildcard && (
                      <Badge variant="destructive" className="text-xs">
                        Full Access
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Assigned Roles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {permissions.roles.length > 0 ? (
                      permissions.roles.map((role) => (
                        <Badge key={role.roleId} variant="secondary" className="text-xs">
                          {role.roleName}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No roles assigned</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scope Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>
                Scope: <Badge variant="outline">{scopeType}</Badge>
                {scopeId && (
                  <>
                    {' / '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{scopeId}</code>
                  </>
                )}
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Permission Categories */}
            <div className="space-y-4">
              {hasWildcard && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-destructive">
                      Wildcard Permission
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This user has the <code className="bg-muted px-1 rounded">*</code> wildcard permission,
                      granting access to all actions.
                    </p>
                  </CardContent>
                </Card>
              )}

              {filteredCategories.map(([category, perms]) => {
                const categoryInfo = PERMISSION_CATEGORIES.find(c => c.key === category);
                const categoryName = categoryInfo?.label || category.charAt(0).toUpperCase() + category.slice(1);

                return (
                  <Card key={category}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <span>{categoryName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {perms.length} permission{perms.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((perm) => {
                          const [, action] = perm.split(':');
                          const isHighPrivilege = ['manage', 'delete', 'write'].includes(action);

                          return (
                            <Badge
                              key={perm}
                              variant={isHighPrivilege ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {perm}
                            </Badge>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredCategories.length === 0 && !hasWildcard && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery
                    ? 'No permissions match your search'
                    : 'No permissions found for this user'}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
