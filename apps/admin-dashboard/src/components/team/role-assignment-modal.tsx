'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usersApi, User, ScopeType } from '@/lib/api/users';
import { rbacApi, Role } from '@/lib/api/rbac';
import { Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface RoleAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  scopeType: ScopeType;
  scopeId: string;
  onSuccess?: () => void;
}

export function RoleAssignmentModal({
  open,
  onOpenChange,
  user,
  scopeType,
  scopeId,
  onSuccess,
}: RoleAssignmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadRoles();
    }
  }, [open, scopeType]);

  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      const data = await rbacApi.getRoles({ scopeType });
      setRoles(data.roles);
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRoleId) return;

    setLoading(true);
    setError(null);

    try {
      await usersApi.assignRole(user.id, {
        roleId: selectedRoleId,
        scopeType,
        scopeId,
      });

      setSelectedRoleId('');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to assign role');
    } finally {
      setLoading(false);
    }
  };

  // Filter out roles that the user already has
  const availableRoles = roles.filter(
    (role) => !user?.roleAssignments?.some((ra) => ra.roleId === role.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assign RBAC role</DialogTitle>
            <DialogDescription>
              Assign a role to {user?.firstName || user?.email} to grant specific permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Select role</Label>
              {loadingRoles ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableRoles.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  {roles.length === 0
                    ? 'No roles available. Create roles first.'
                    : 'User already has all available roles.'}
                </div>
              ) : (
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: role.color || '#71717a' }}
                          />
                          <div className="flex flex-col">
                            <span>{role.name}</span>
                            {role.description && (
                              <span className="text-xs text-muted-foreground">{role.description}</span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link
                href="/settings/roles"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Manage roles
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedRoleId || availableRoles.length === 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
