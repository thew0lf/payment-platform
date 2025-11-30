'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  UserPlus,
  Users,
  Lock,
  AlertCircle,
  Mail,
  Shield,
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
import { useRbac } from '@/hooks/use-rbac';
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
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
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
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleAssignRole = (user: User) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const handleRemoveRole = async (user: User, roleId: string) => {
    if (!confirm('Remove this role assignment?')) return;
    try {
      await usersApi.removeRole(user.id, roleId);
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to remove role:', err);
      alert(`Failed to remove role: ${err.message}`);
    }
  };

  if (!canViewUsers) {
    return (
      <>
        <Header title="Team" subtitle="Manage team members and roles" />
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Lock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Access Denied</h3>
              <p className="text-sm text-zinc-400">
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
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white">{stats.total}</p>
                    <p className="text-xs text-zinc-500">Total members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white">{stats.active}</p>
                    <p className="text-xs text-zinc-500">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white">{stats.pending}</p>
                    <p className="text-xs text-zinc-500">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white">{stats.inactive}</p>
                    <p className="text-xs text-zinc-500">Inactive</p>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
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
                <div key={i} className="h-48 bg-zinc-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="h-64 bg-zinc-800/50 rounded-lg animate-pulse" />
          )
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Failed to load team members</h3>
              <p className="text-sm text-zinc-400 mb-4">{error}</p>
              <Button onClick={fetchUsers}>Try Again</Button>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {search || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'No members found'
                  : 'No team members yet'}
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
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
              />
            ))}
          </div>
        ) : (
          <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-zinc-800">
                  <TableHead className="text-zinc-400">Member</TableHead>
                  <TableHead className="text-zinc-400">Role</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400 hidden md:table-cell">Company</TableHead>
                  <TableHead className="text-zinc-400 hidden lg:table-cell">Last Login</TableHead>
                  {canManageUsers && <TableHead className="text-zinc-400 w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {u.avatar && <AvatarImage src={u.avatar} alt={getUserFullName(u)} />}
                          <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">
                            {getUserInitials(u)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">{getUserFullName(u)}</p>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(u.role)}>{formatRole(u.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(u.status)}>{formatStatus(u.status)}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-zinc-400">
                      {u.companyName || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-zinc-400">
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
          <p className="text-sm text-zinc-500">
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
    </>
  );
}
