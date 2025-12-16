import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeType } from '@prisma/client';
import { PERMISSIONS_KEY, PERMISSION_MODE_KEY, PermissionMode } from '../decorators/permissions.decorator';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions required
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const mode = this.reflector.getAllAndOverride<PermissionMode>(PERMISSION_MODE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || 'all';

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Determine the scope from the request context
    const { scopeType, scopeId } = this.extractScope(request, user);

    // Check permissions
    let hasPermission: boolean;

    if (mode === 'any') {
      hasPermission = await this.permissionService.hasAnyPermission(
        user.id,
        requiredPermissions,
        scopeType,
        scopeId,
      );
    } else {
      hasPermission = await this.permissionService.hasAllPermissions(
        user.id,
        requiredPermissions,
        scopeType,
        scopeId,
      );
    }

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied for user ${user.id}: requires ${mode === 'all' ? 'all of' : 'any of'} [${requiredPermissions.join(', ')}]`,
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Extract scope from request context
   * Priority:
   * 1. Explicit scope in query/body
   * 2. User's primary scope
   */
  private extractScope(
    request: any,
    user: any,
  ): { scopeType: ScopeType; scopeId: string } {
    // Check for explicit scope in request
    const query = request.query || {};
    const body = request.body || {};
    const params = request.params || {};

    // Try to find scopeType/scopeId in request
    const scopeType = query.scopeType || body.scopeType;
    const scopeId = query.scopeId || body.scopeId;

    // If not explicit, derive from resource-specific params
    if (!scopeType || !scopeId) {
      // Check for companyId (most common)
      const companyId = params.companyId || query.companyId || body.companyId || user.companyId;
      if (companyId) {
        return { scopeType: ScopeType.COMPANY, scopeId: companyId };
      }

      // Check for clientId
      const clientId = params.clientId || query.clientId || body.clientId || user.clientId;
      if (clientId) {
        return { scopeType: ScopeType.CLIENT, scopeId: clientId };
      }

      // Check for organizationId
      const organizationId = params.organizationId || query.organizationId || body.organizationId || user.organizationId;
      if (organizationId) {
        return { scopeType: ScopeType.ORGANIZATION, scopeId: organizationId };
      }
    }

    // Fall back to user's primary scope
    return {
      scopeType: user.scopeType as ScopeType,
      scopeId: user.scopeId,
    };
  }
}
