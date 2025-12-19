'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  Search,
  UserPlus,
  Users,
  Lock,
  AlertCircle,
  Mail,
  Shield,
  ShieldCheck,
  Building2,
  Clock,
  MoreHorizontal,
  Filter,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle';
import { TeamMemberCard } from '@/components/team/team-member-card';
import { InviteUserModal } from '@/components/team/invite-user-modal';
import { RoleAssignmentModal } from '@/components/team/role-assignment-modal';
import { UserPermissionsViewer } from '@/components/rbac';
import { useRbac } from '@/hooks/use-rbac';
import { ScopeType as RbacScopeType } from '@/lib/api/rbac';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { useAuth } from '@/contexts/auth-context';
import {
  usersApi,
  User,
  UserStats,
  UserRole,
  UserStatus,
  ScopeType,
  USER_ROLES,
  USER_STATUSES,
  getUserFullName,
  getUserInitials,
  getStatusBadgeVariant,
  getRoleBadgeVariant,
  formatRole,
  formatStatus,
} from '@/lib/api/users';

const VIEW_PREFERENCE_KEY = 'team_view_mode';

export default function TeamPage() {
  const { hasPermission } = useRbac();
  const { user } = useAuth();
  const { selectedCompanyId, selectedClientId } = useHierarchy();

  const canManageUsers = hasPermission('users:write');
  const canViewUsers = hasPermission('users:read');

  // Determine current scope
  const scopeType: ScopeType = selectedCompanyId ? 'COMPANY' : selectedClientId ? 'CLIENT' : 'ORGANIZATION';
  const scopeId = selectedCompanyId || selectedClientId || user?.organizationId || '';

  // State
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_PREFERENCE_KEY);
      return (saved as ViewMode) || 'cards';
    }
    return 'cards';
  });
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  // Confirmation modal state
  const [roleToRemove, setRoleToRemove] = useState<{ user: User; roleId: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionsViewer, setShowPermissionsViewer] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Save view preference
  const handleViewChange = (newView: ViewMode) => {
    setView(newView);
    localStorage.setItem(VIEW_PREFERENCE_KEY, newView);
  };

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [usersResult, statsResult] = await Promise.all([
        usersApi.list({
          search: search || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: 50,
        }),
        usersApi.getStats(),
      ]);

      setUsers(usersResult.users);
      setTotal(usersResult.total);
      setStats(statsResult);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Handlers
  const handleEdit = (user: User) => {
    // For now, just open role assignment
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const handleStatusChange = async (user: User, status: UserStatus) => {
    try {
      await usersApi.updateStatus(user.id, status);
      toast.success(`Status updated to ${formatStatus(status)}`);
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status. Please try again.');
    }
  };

  const handleAssignRole = (user: User) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const handleViewPermissions = (user: User) => {
    setSelectedUser(user);
    setShowPermissionsViewer(true);
  };

  const handleRemoveRole = (user: User, roleId: string) => {
    setRoleToRemove({ user, roleId });
  };

  const confirmRemoveRole = async () => {
    if (!roleToRemove) return;
    try {
      await usersApi.removeRole(roleToRemove.user.id, roleToRemove.roleId);
      toast.success('Role removed successfully');
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to remove role:', err);
      toast.error('Failed to remove role. Please try again.');
    } finally {
      setRoleToRemove(null);
    }
  };

  if (!canViewUsers) {
    return (
      <>
        <Header title="Team" subtitle="Manage team members and roles" />
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Access Denied</h3>
              <p className="text-sm text-muted-foreground">
                You don&apos;t have permission to view team members.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Team"
        subtitle="Manage team members and their access"
        actions={
          canManageUsers && (
            <Button size="sm" onClick={() => setShowInviteModal(true)}>
              <UserPlus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Invite Member</span>
            </Button>
          )
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{stats.active}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{stats.inactive}</p>
                    <p className="text-xs text-muted-foreground">Inactive</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-3 flex-col sm:flex-row w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => setRoleFilter(v as UserRole | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as UserStatus | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {USER_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ViewToggle view={view} onViewChange={handleViewChange} />
        </div>

        {/* Content */}
        {isLoading ? (
          view === 'cards' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
          )
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Failed to load team members</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchUsers}>Try Again</Button>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {search || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'No members found'
                  : 'No team members yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try different filters or search terms'
                  : 'Invite your first team member to get started.'}
              </p>
              {!search && roleFilter === 'all' && statusFilter === 'all' && canManageUsers && (
                <Button onClick={() => setShowInviteModal(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              )}
            </CardContent>
          </Card>
        ) : view === 'cards' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => (
              <TeamMemberCard
                key={u.id}
                user={u}
                onEdit={canManageUsers ? handleEdit : undefined}
                onStatusChange={canManageUsers ? handleStatusChange : undefined}
                onAssignRole={canManageUsers ? handleAssignRole : undefined}
                onRemoveRole={canManageUsers ? handleRemoveRole : undefined}
                onViewPermissions={handleViewPermissions}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-card/50 border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Member</TableHead>
                  <TableHead className="text-muted-foreground">Role</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground hidden md:table-cell">Company</TableHead>
                  <TableHead className="text-muted-foreground hidden lg:table-cell">Last Login</TableHead>
                  {canManageUsers && <TableHead className="text-muted-foreground w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="border-border hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {u.avatar && <AvatarImage src={u.avatar} alt={getUserFullName(u)} />}
                          <AvatarFallback className="bg-muted text-foreground text-xs">
                            {getUserInitials(u)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{getUserFullName(u)}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(u.role)}>{formatRole(u.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(u.status)}>{formatStatus(u.status)}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {u.companyName || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </TableCell>
                    {canManageUsers && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleViewPermissions(u)}>
                              <ShieldCheck className="w-4 h-4 mr-2" />
                              View permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAssignRole(u)}>
                              <Shield className="w-4 h-4 mr-2" />
                              Assign role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {u.status !== 'ACTIVE' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(u, 'ACTIVE')}>
                                Set active
                              </DropdownMenuItem>
                            )}
                            {u.status !== 'INACTIVE' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(u, 'INACTIVE')}>
                                Set inactive
                              </DropdownMenuItem>
                            )}
                            {u.status !== 'SUSPENDED' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(u, 'SUSPENDED')}
                                className="text-red-400 focus:text-red-400"
                              >
                                Suspend user
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Results count */}
        {users.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Showing {users.length} of {total} team members
          </p>
        )}
      </div>

      {/* Modals */}
      <InviteUserModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        scopeType={scopeType}
        scopeId={scopeId}
        onSuccess={fetchUsers}
      />

      <RoleAssignmentModal
        open={showRoleModal}
        onOpenChange={setShowRoleModal}
        user={selectedUser}
        scopeType={scopeType}
        scopeId={scopeId}
        onSuccess={fetchUsers}
      />

      {/* Remove Role Confirmation Modal */}
      {roleToRemove && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Remove Role?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to remove this role assignment from {getUserFullName(roleToRemove.user)}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setRoleToRemove(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmRemoveRole}>
                Remove Role
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* User Permissions Viewer */}
      {selectedUser && (
        <UserPermissionsViewer
          userId={selectedUser.id}
          userName={getUserFullName(selectedUser)}
          userEmail={selectedUser.email}
          scopeType={scopeType as RbacScopeType}
          scopeId={scopeId}
          isOpen={showPermissionsViewer}
          onClose={() => setShowPermissionsViewer(false)}
        />
      )}
    </>
  );
}
