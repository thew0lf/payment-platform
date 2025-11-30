'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Search,
  MoreHorizontal,
  Users,
  Lock,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RoleCard } from '@/components/rbac/role-card';
import { PermissionMatrix } from '@/components/rbac/permission-matrix';
import { useRoles, usePermissionsList, useRbac } from '@/hooks/use-rbac';
import { useHierarchy } from '@/contexts/hierarchy-context';
import * as rbacApi from '@/lib/api/rbac';
import type { Role, Permission, ScopeType } from '@/lib/api/rbac';

export default function RolesPage() {
  const { hasPermission } = useRbac();
  const { selectedCompanyId, selectedClientId } = useHierarchy();
  const canManageRoles = hasPermission('roles:write');
  const canViewRoles = hasPermission('roles:read');

  // Determine current scope
  const scopeType: ScopeType = selectedCompanyId ? 'COMPANY' : selectedClientId ? 'CLIENT' : 'ORGANIZATION';
  const scopeId = selectedCompanyId || selectedClientId || '';

  const { roles, isLoading: rolesLoading, error: rolesError, refresh: refreshRoles, createRole, updateRole, deleteRole } = useRoles(scopeType, scopeId);
  const { permissions, isLoading: permsLoading } = usePermissionsList();

  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#0284c7',
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Filter roles by search
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(search.toLowerCase()) ||
    role.slug.toLowerCase().includes(search.toLowerCase()) ||
    role.description?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateRole = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      await createRole({
        name: formData.name,
        description: formData.description,
        color: formData.color,
        scopeType,
        scopeId,
        permissionIds: Array.from(selectedPermissions),
      });
      handleCloseModal();
    } catch (err) {
      console.error('Failed to create role:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || !formData.name.trim()) return;

    setIsSaving(true);
    try {
      await updateRole(selectedRole.id, {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        permissionIds: Array.from(selectedPermissions),
      });
      handleCloseModal();
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) {
      alert('System roles cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) return;

    try {
      await deleteRole(role.id);
    } catch (err) {
      console.error('Failed to delete role:', err);
    }
  };

  const handleEditClick = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      color: role.color || '#0284c7',
    });
    setSelectedPermissions(new Set(role.permissions?.map(p => p.permissionId) || []));
    setShowEditModal(true);
  };

  const handleViewClick = (role: Role) => {
    setSelectedRole(role);
    setShowViewModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedRole(null);
    setFormData({ name: '', description: '', color: '#0284c7' });
    setSelectedPermissions(new Set());
  };

  const handleTogglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const colorOptions = [
    { value: '#dc2626', label: 'Red' },
    { value: '#ea580c', label: 'Orange' },
    { value: '#ca8a04', label: 'Yellow' },
    { value: '#16a34a', label: 'Green' },
    { value: '#0284c7', label: 'Blue' },
    { value: '#7c3aed', label: 'Purple' },
    { value: '#db2777', label: 'Pink' },
    { value: '#6b7280', label: 'Gray' },
  ];

  if (!canViewRoles) {
    return (
      <>
        <Header title="Roles & Permissions" subtitle="Manage access control roles" />
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Lock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Access Denied</h3>
              <p className="text-sm text-zinc-400">
                You don&apos;t have permission to view roles.
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
        title="Roles & Permissions"
        subtitle="Manage access control roles and their permissions"
        actions={
          canManageRoles && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Role</span>
            </Button>
          )
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Roles Grid */}
        {rolesLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-zinc-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : rolesError ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Failed to load roles</h3>
              <p className="text-sm text-zinc-400 mb-4">{rolesError}</p>
              <Button onClick={refreshRoles}>Try Again</Button>
            </CardContent>
          </Card>
        ) : filteredRoles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {search ? 'No roles found' : 'No roles yet'}
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                {search
                  ? 'Try a different search term'
                  : 'Create your first custom role to get started.'}
              </p>
              {!search && canManageRoles && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Role
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.map(role => (
              <RoleCard
                key={role.id}
                role={role}
                showPermissions
                onAssign={canManageRoles ? handleViewClick : undefined}
                onEdit={canManageRoles && !role.isSystem ? handleEditClick : undefined}
                onDelete={canManageRoles && !role.isSystem ? handleDeleteRole : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Role Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">
                {showCreateModal ? 'Create Role' : 'Edit Role'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Name</label>
                <Input
                  placeholder="e.g., Sales Manager"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Description</label>
                <Input
                  placeholder="Brief description of this role"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        formData.color === color.value
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                          : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Permissions</label>
                <PermissionMatrix
                  permissions={permissions}
                  roles={roles}
                  selectedPermissions={selectedPermissions}
                  onTogglePermission={handleTogglePermission}
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-zinc-800">
              <Button variant="outline" className="flex-1" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={showCreateModal ? handleCreateRole : handleUpdateRole}
                disabled={!formData.name.trim() || isSaving}
              >
                {isSaving ? 'Saving...' : showCreateModal ? 'Create Role' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Role Modal */}
      {showViewModal && selectedRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: selectedRole.color || '#6b7280' }}
                >
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedRole.name}</h2>
                  <p className="text-sm text-zinc-400">{selectedRole.slug}</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Role info */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedRole.isSystem && (
                  <Badge variant="info">System Role</Badge>
                )}
                {selectedRole.isDefault && (
                  <Badge variant="success">Default</Badge>
                )}
                <Badge variant="outline">{selectedRole.scopeType}</Badge>
              </div>

              {selectedRole.description && (
                <p className="text-sm text-zinc-400">{selectedRole.description}</p>
              )}

              {/* Permissions (read-only) */}
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-2">Permissions</h3>
                <PermissionMatrix
                  permissions={permissions}
                  roles={roles}
                  selectedPermissions={new Set(selectedRole.permissions?.map(p => p.permissionId) || [])}
                  onTogglePermission={() => {}}
                  readOnly
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-zinc-800">
              <Button variant="outline" className="flex-1" onClick={handleCloseModal}>
                Close
              </Button>
              {canManageRoles && !selectedRole.isSystem && (
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleCloseModal();
                    handleEditClick(selectedRole);
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Role
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
