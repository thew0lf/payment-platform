'use client';

import { useState, useMemo } from 'react';
import { Check, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Permission, Role, PERMISSION_CATEGORIES } from '@/lib/api/rbac';

interface PermissionMatrixProps {
  permissions: Permission[];
  roles: Role[];
  selectedPermissions: Set<string>;
  onTogglePermission: (permissionId: string) => void;
  readOnly?: boolean;
}

/**
 * Permission matrix for selecting permissions when editing a role
 */
export function PermissionMatrix({
  permissions,
  roles,
  selectedPermissions,
  onTogglePermission,
  readOnly = false,
}: PermissionMatrixProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const perm of permissions) {
      const existing = groups.get(perm.category) || [];
      groups.set(perm.category, [...existing, perm]);
    }
    return groups;
  }, [permissions]);

  // Filter permissions by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedPermissions;

    const searchLower = search.toLowerCase();
    const filtered = new Map<string, Permission[]>();

    Array.from(groupedPermissions.entries()).forEach(([category, perms]) => {
      const matching = perms.filter(
        (p: Permission) =>
          p.code.toLowerCase().includes(searchLower) ||
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      );
      if (matching.length > 0) {
        filtered.set(category, matching);
      }
    });

    return filtered;
  }, [groupedPermissions, search]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleAllInCategory = (category: string) => {
    if (readOnly) return;

    const categoryPerms = groupedPermissions.get(category) || [];
    const allSelected = categoryPerms.every((p) => selectedPermissions.has(p.id));

    for (const perm of categoryPerms) {
      if (allSelected) {
        // Deselect all
        if (selectedPermissions.has(perm.id)) {
          onTogglePermission(perm.id);
        }
      } else {
        // Select all
        if (!selectedPermissions.has(perm.id)) {
          onTogglePermission(perm.id);
        }
      }
    }
  };

  const getCategoryInfo = (category: string) => {
    const info = PERMISSION_CATEGORIES.find((c) => c.key === category);
    return info || { key: category, label: category, icon: 'Shield' };
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search permissions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-muted/50 border-border"
        />
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {Array.from(filteredGroups).map(([category, perms]) => {
          const categoryInfo = getCategoryInfo(category);
          const selectedCount = perms.filter((p) => selectedPermissions.has(p.id)).length;
          const allSelected = selectedCount === perms.length;
          const someSelected = selectedCount > 0 && !allSelected;
          const isExpanded = expandedCategories.has(category) || search.length > 0;

          return (
            <div
              key={category}
              className="bg-muted/30 rounded-lg border border-border/50 overflow-hidden"
            >
              {/* Category header */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center gap-3">
                  {!readOnly && (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleAllInCategory(category)}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(someSelected && 'data-[state=checked]:bg-primary/50')}
                    />
                  )}
                  <div>
                    <span className="font-medium text-foreground">{categoryInfo.label}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({selectedCount}/{perms.length})
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-muted/50">
                  {perms.length} permission{perms.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Permissions list */}
              {isExpanded && (
                <div className="border-t border-border/50 divide-y divide-border/30">
                  {perms.map((perm) => {
                    const isSelected = selectedPermissions.has(perm.id);

                    return (
                      <div
                        key={perm.id}
                        className={cn(
                          'flex items-center justify-between p-3 pl-12 transition-colors',
                          !readOnly && 'hover:bg-muted/20 cursor-pointer',
                          isSelected && 'bg-primary/5'
                        )}
                        onClick={() => !readOnly && onTogglePermission(perm.id)}
                      >
                        <div className="flex items-center gap-3">
                          {!readOnly && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onTogglePermission(perm.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          {readOnly && (
                            <div
                              className={cn(
                                'w-5 h-5 rounded flex items-center justify-center',
                                isSelected
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-muted/50 text-muted-foreground'
                              )}
                            >
                              {isSelected ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-foreground">{perm.name}</div>
                            <div className="text-xs text-muted-foreground">
                              <code className="bg-muted/50 px-1 rounded">{perm.code}</code>
                              {perm.description && (
                                <span className="ml-2">{perm.description}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredGroups.size === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No permissions found matching "{search}"
        </div>
      )}
    </div>
  );
}

/**
 * Compact permission list (read-only display)
 */
export function PermissionList({ permissions }: { permissions: Permission[] }) {
  const grouped = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const perm of permissions) {
      const existing = groups.get(perm.category) || [];
      groups.set(perm.category, [...existing, perm]);
    }
    return groups;
  }, [permissions]);

  return (
    <div className="space-y-3">
      {Array.from(grouped).map(([category, perms]) => (
        <div key={category}>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            {category}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {perms.map((perm) => (
              <Badge
                key={perm.id}
                variant="secondary"
                className="text-xs bg-muted/50 text-foreground"
              >
                {perm.code}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
