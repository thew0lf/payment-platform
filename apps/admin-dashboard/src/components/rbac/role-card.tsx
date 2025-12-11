'use client';

import { useState } from 'react';
import { Shield, Users, Lock, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Role, Permission, getRoleColorClass } from '@/lib/api/rbac';

interface RoleCardProps {
  role: Role;
  onEdit?: (role: Role) => void;
  onDelete?: (role: Role) => void;
  onAssign?: (role: Role) => void;
  showPermissions?: boolean;
  compact?: boolean;
}

export function RoleCard({
  role,
  onEdit,
  onDelete,
  onAssign,
  showPermissions = false,
  compact = false,
}: RoleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const permissionCount = role.permissions?.length || 0;

  // Group permissions by category
  const groupedPermissions = role.permissions?.reduce((acc, rp) => {
    const category = rp.permission?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(rp.permission!);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-border/50 transition-colors">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              role.color ? '' : 'bg-gray-500'
            )}
            style={role.color ? { backgroundColor: role.color } : undefined}
          />
          <div>
            <span className="font-medium text-foreground">{role.name}</span>
            {role.isSystem && (
              <Badge variant="outline" className="ml-2 text-xs">
                System
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
          </span>
          {onAssign && (
            <Button size="sm" variant="ghost" onClick={() => onAssign(role)}>
              <Users className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              role.color ? '' : 'bg-gray-500/20'
            )}
            style={role.color ? { backgroundColor: `${role.color}20` } : undefined}
          >
            <Shield
              className="h-5 w-5"
              style={role.color ? { color: role.color } : { color: '#6b7280' }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{role.name}</h3>
              {role.isSystem && (
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  System
                </Badge>
              )}
              {role.isDefault && (
                <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                  Default
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {role.description || 'No description'}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="capitalize">{role.scopeType.toLowerCase()} level</span>
              <span>Priority: {role.priority}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onAssign && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onAssign(role)}
            >
              <Users className="h-4 w-4" />
            </Button>
          )}
          {onEdit && !role.isSystem && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(role)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && !role.isSystem && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-red-400"
              onClick={() => onDelete(role)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Permissions section */}
      {showPermissions && role.permissions && role.permissions.length > 0 && (
        <div className="border-t border-border/50">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
          >
            <span>
              {permissionCount} permission{permissionCount !== 1 ? 's' : ''}
            </span>
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {expanded && groupedPermissions && (
            <div className="px-4 pb-4 space-y-3">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                    {category}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map((perm) => (
                      <Badge
                        key={perm.id}
                        variant="secondary"
                        className="text-xs bg-muted/50 text-foreground hover:bg-muted"
                      >
                        {perm.code}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Role badge for inline display
 */
export function RoleBadge({ role, size = 'default' }: { role: Role | { name: string; color?: string }; size?: 'sm' | 'default' }) {
  const colorStyle = role.color ? { backgroundColor: `${role.color}20`, color: role.color, borderColor: `${role.color}40` } : {};

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        size === 'sm' ? 'text-xs px-1.5 py-0' : ''
      )}
      style={colorStyle}
    >
      {role.name}
    </Badge>
  );
}
