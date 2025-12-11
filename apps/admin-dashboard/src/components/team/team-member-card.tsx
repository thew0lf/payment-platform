'use client';

import { useState } from 'react';
import { MoreHorizontal, Mail, Shield, Building2, Clock, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User,
  getUserFullName,
  getUserInitials,
  getStatusBadgeVariant,
  getRoleBadgeVariant,
  formatRole,
  formatStatus,
} from '@/lib/api/users';
import { cn } from '@/lib/utils';

interface TeamMemberCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onStatusChange?: (user: User, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => void;
  onAssignRole?: (user: User) => void;
  onRemoveRole?: (user: User, roleId: string) => void;
}

export function TeamMemberCard({
  user,
  onEdit,
  onStatusChange,
  onAssignRole,
  onRemoveRole,
}: TeamMemberCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const fullName = getUserFullName(user);
  const initials = getUserInitials(user);
  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleDateString()
    : 'Never';

  return (
    <Card className="bg-card/50 border-border hover:border-border transition-colors">
      <CardContent className="p-4">
        {/* Header with avatar and menu */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {user.avatar && <AvatarImage src={user.avatar} alt={fullName} />}
              <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-foreground">{fullName}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit?.(user)}>
                Edit user
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAssignRole?.(user)}>
                Assign role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.status !== 'ACTIVE' && (
                <DropdownMenuItem onClick={() => onStatusChange?.(user, 'ACTIVE')}>
                  Set active
                </DropdownMenuItem>
              )}
              {user.status !== 'INACTIVE' && (
                <DropdownMenuItem onClick={() => onStatusChange?.(user, 'INACTIVE')}>
                  Set inactive
                </DropdownMenuItem>
              )}
              {user.status !== 'SUSPENDED' && (
                <DropdownMenuItem
                  onClick={() => onStatusChange?.(user, 'SUSPENDED')}
                  className="text-red-400 focus:text-red-400"
                >
                  Suspend user
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant={getStatusBadgeVariant(user.status)}>
            {formatStatus(user.status)}
          </Badge>
          <Badge variant={getRoleBadgeVariant(user.role)}>
            {formatRole(user.role)}
          </Badge>
          {!user.emailVerified && (
            <Badge variant="outline" className="border-amber-600/50 text-amber-400">
              Pending verification
            </Badge>
          )}
        </div>

        {/* Info section */}
        <div className="space-y-2 text-sm">
          {user.companyName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{user.companyName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last login: {lastLogin}</span>
          </div>
        </div>

        {/* RBAC Roles section */}
        {user.roleAssignments && user.roleAssignments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full"
            >
              <Shield className="h-4 w-4" />
              <span>{user.roleAssignments.length} RBAC role{user.roleAssignments.length !== 1 ? 's' : ''}</span>
              <ChevronDown
                className={cn('h-4 w-4 ml-auto transition-transform', isExpanded && 'rotate-180')}
              />
            </button>
            {isExpanded && (
              <div className="mt-2 space-y-2">
                {user.roleAssignments.map((ra) => (
                  <div
                    key={ra.id}
                    className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: ra.roleColor || '#71717a' }}
                        />
                        <span className="text-sm font-medium text-foreground">{ra.roleName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ra.scopeType}: {ra.scopeName || ra.scopeId}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground hover:text-red-400"
                      onClick={() => onRemoveRole?.(user, ra.roleId)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
