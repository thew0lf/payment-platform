import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ScopeType, PermissionGrantType } from '@prisma/client';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { RequirePermissions, RequireAnyPermission } from './decorators/permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { PermissionGrantService } from './services/permission-grant.service';
import { SessionService } from './services/session.service';
import { HierarchyService, UserContext } from '../hierarchy/hierarchy.service';
import {
  CreatePermissionDto,
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  GrantPermissionDto,
} from './types/rbac.types';

// Scope hierarchy - higher number = higher privilege
const SCOPE_HIERARCHY: Record<ScopeType, number> = {
  ORGANIZATION: 5,
  CLIENT: 4,
  COMPANY: 3,
  DEPARTMENT: 2,
  TEAM: 1,
  VENDOR: 4,
  VENDOR_COMPANY: 3,
  VENDOR_DEPARTMENT: 2,
  VENDOR_TEAM: 1,
};

@Controller('rbac')
@UseGuards(CombinedAuthGuard)
export class RbacController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly roleService: RoleService,
    private readonly grantService: PermissionGrantService,
    private readonly sessionService: SessionService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private toUserContext(user: AuthenticatedUser): UserContext {
    return {
      sub: user.id,
      scopeType: user.scopeType as ScopeType,
      scopeId: user.scopeId,
      organizationId: user.organizationId,
      clientId: user.clientId,
      companyId: user.companyId,
      departmentId: user.departmentId,
    };
  }

  /**
   * Verify user can operate in the target scope
   * Cannot create/manage roles at a higher scope level than their own
   */
  private async canOperateInScope(
    user: AuthenticatedUser,
    targetScopeType: ScopeType,
    targetScopeId: string,
  ): Promise<boolean> {
    const userContext = this.toUserContext(user);

    // Cannot operate in a higher scope than your own
    if (SCOPE_HIERARCHY[targetScopeType] > SCOPE_HIERARCHY[user.scopeType as ScopeType]) {
      return false;
    }

    // Use HierarchyService to verify access to the target scope
    return this.hierarchyService.canInviteToScope(userContext, targetScopeType, targetScopeId);
  }

  // ═══════════════════════════════════════════════════════════════
  // PERMISSIONS
  // ═══════════════════════════════════════════════════════════════

  @Get('permissions')
  @RequireAnyPermission('roles:read', 'roles:manage')
  async getPermissions(@Query('category') category?: string) {
    return this.permissionService.findAll(category);
  }

  @Post('permissions')
  @UseGuards(PermissionGuard)
  @RequirePermissions('roles:manage')
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.permissionService.create(dto);
  }

  @Get('permissions/:id')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission('roles:read', 'roles:manage')
  async getPermission(@Param('id') id: string) {
    return this.permissionService.findById(id);
  }

  @Delete('permissions/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('roles:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePermission(@Param('id') id: string) {
    await this.permissionService.delete(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // ROLES
  // ═══════════════════════════════════════════════════════════════

  @Get('roles')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission('roles:read', 'roles:manage')
  async getRoles(
    @Query('scopeType') scopeType?: ScopeType,
    @Query('scopeId') scopeId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    // Get scope filter based on user's position in hierarchy
    const userContext = user ? this.toUserContext(user) : null;
    const scopeFilter = userContext
      ? await this.hierarchyService.getUserScopeFilter(userContext)
      : {};

    return this.roleService.findAllWithScopeFilter(scopeType, scopeId, scopeFilter);
  }

  @Post('roles')
  @UseGuards(PermissionGuard)
  @RequirePermissions('roles:manage')
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify user can create roles in the target scope
    const canOperate = await this.canOperateInScope(user, dto.scopeType, dto.scopeId || user.scopeId);
    if (!canOperate) {
      throw new ForbiddenException('You cannot create roles in this scope');
    }

    return this.roleService.create(dto, user.id);
  }

  @Get('roles/:id')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission('roles:read', 'roles:manage')
  async getRole(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.roleService.findById(id);

    // Verify user can access this role's scope
    const canOperate = await this.canOperateInScope(user, role.scopeType, role.scopeId || user.scopeId);
    if (!canOperate) {
      throw new ForbiddenException('You do not have access to view this role');
    }

    return role;
  }

  @Put('roles/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('roles:manage')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.roleService.findById(id);

    // Verify user can manage roles in this scope
    const canOperate = await this.canOperateInScope(user, role.scopeType, role.scopeId || user.scopeId);
    if (!canOperate) {
      throw new ForbiddenException('You cannot manage roles in this scope');
    }

    return this.roleService.update(id, dto, user.id);
  }

  @Delete('roles/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('roles:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.roleService.findById(id);

    // Verify user can manage roles in this scope
    const canOperate = await this.canOperateInScope(user, role.scopeType, role.scopeId || user.scopeId);
    if (!canOperate) {
      throw new ForbiddenException('You cannot delete roles in this scope');
    }

    await this.roleService.delete(id, user.id);
  }

  @Put('roles/:id/permissions')
  @UseGuards(PermissionGuard)
  @RequirePermissions('roles:manage')
  async setRolePermissions(
    @Param('id') id: string,
    @Body() body: { permissionIds: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = await this.roleService.findById(id);

    // Verify user can manage roles in this scope
    const canOperate = await this.canOperateInScope(user, role.scopeType, role.scopeId || user.scopeId);
    if (!canOperate) {
      throw new ForbiddenException('You cannot manage role permissions in this scope');
    }

    await this.roleService.setRolePermissions(id, body.permissionIds);
    return this.roleService.findById(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // ROLE ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════

  @Post('assignments')
  @UseGuards(PermissionGuard)
  @RequirePermissions('users:manage')
  @HttpCode(HttpStatus.CREATED)
  async assignRole(
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify user can assign roles in the target scope
    const canOperate = await this.canOperateInScope(user, dto.scopeType, dto.scopeId);
    if (!canOperate) {
      throw new ForbiddenException('You cannot assign roles in this scope');
    }

    // Also verify user can manage the target user
    const userContext = this.toUserContext(user);
    const canManageUser = await this.hierarchyService.canManageUser(userContext, dto.userId);
    if (!canManageUser) {
      throw new ForbiddenException('You do not have access to manage this user');
    }

    await this.roleService.assignRole(dto, user.id);
    return { success: true };
  }

  @Delete('assignments')
  @UseGuards(PermissionGuard)
  @RequirePermissions('users:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassignRole(
    @Query('userId') userId: string,
    @Query('roleId') roleId: string,
    @Query('scopeType') scopeType: ScopeType,
    @Query('scopeId') scopeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify user can manage roles in the target scope
    const canOperate = await this.canOperateInScope(user, scopeType, scopeId);
    if (!canOperate) {
      throw new ForbiddenException('You cannot manage roles in this scope');
    }

    // Also verify user can manage the target user
    const userContext = this.toUserContext(user);
    const canManageUser = await this.hierarchyService.canManageUser(userContext, userId);
    if (!canManageUser) {
      throw new ForbiddenException('You do not have access to manage this user');
    }

    await this.roleService.unassignRole(userId, roleId, scopeType, scopeId, user.id);
  }

  @Get('users/:userId/roles')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission('users:read', 'users:manage')
  async getUserRoles(
    @Param('userId') userId: string,
    @Query('scopeType') scopeType?: ScopeType,
    @Query('scopeId') scopeId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    // Verify user can view the target user
    if (user) {
      const userContext = this.toUserContext(user);
      const canManageUser = await this.hierarchyService.canManageUser(userContext, userId);
      if (!canManageUser) {
        throw new ForbiddenException('You do not have access to view this user\'s roles');
      }
    }

    return this.roleService.getUserRoles(userId, scopeType, scopeId);
  }

  // ═══════════════════════════════════════════════════════════════
  // PERMISSION GRANTS
  // ═══════════════════════════════════════════════════════════════

  @Post('grants')
  @UseGuards(PermissionGuard)
  @RequirePermissions('users:manage')
  async grantPermission(
    @Body() dto: GrantPermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify user can grant permissions in the target scope
    const canOperate = await this.canOperateInScope(user, dto.scopeType, dto.scopeId);
    if (!canOperate) {
      throw new ForbiddenException('You cannot grant permissions in this scope');
    }

    // Also verify user can manage the target user
    const userContext = this.toUserContext(user);
    const canManageUser = await this.hierarchyService.canManageUser(userContext, dto.userId);
    if (!canManageUser) {
      throw new ForbiddenException('You do not have access to manage this user');
    }

    return this.grantService.grantPermission(dto, user.id);
  }

  @Delete('grants')
  @UseGuards(PermissionGuard)
  @RequirePermissions('users:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeGrant(
    @Query('userId') userId: string,
    @Query('permissionId') permissionId: string,
    @Query('scopeType') scopeType: ScopeType,
    @Query('scopeId') scopeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify user can manage permissions in the target scope
    const canOperate = await this.canOperateInScope(user, scopeType, scopeId);
    if (!canOperate) {
      throw new ForbiddenException('You cannot manage permissions in this scope');
    }

    // Also verify user can manage the target user
    const userContext = this.toUserContext(user);
    const canManageUser = await this.hierarchyService.canManageUser(userContext, userId);
    if (!canManageUser) {
      throw new ForbiddenException('You do not have access to manage this user');
    }

    await this.grantService.revokeGrant(userId, permissionId, scopeType, scopeId);
  }

  @Get('users/:userId/grants')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission('users:read', 'users:manage')
  async getUserGrants(
    @Param('userId') userId: string,
    @Query('scopeType') scopeType?: ScopeType,
    @Query('scopeId') scopeId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    // Verify user can view the target user
    if (user) {
      const userContext = this.toUserContext(user);
      const canManageUser = await this.hierarchyService.canManageUser(userContext, userId);
      if (!canManageUser) {
        throw new ForbiddenException('You do not have access to view this user\'s grants');
      }
    }

    return this.grantService.getUserGrants(userId, scopeType, scopeId);
  }

  // ═══════════════════════════════════════════════════════════════
  // EFFECTIVE PERMISSIONS
  // ═══════════════════════════════════════════════════════════════

  @Get('users/:userId/effective-permissions')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission('users:read', 'users:manage')
  async getEffectivePermissions(
    @Param('userId') userId: string,
    @Query('scopeType') scopeType: ScopeType,
    @Query('scopeId') scopeId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    // Verify user can view the target user
    if (user) {
      const userContext = this.toUserContext(user);
      const canManageUser = await this.hierarchyService.canManageUser(userContext, userId);
      if (!canManageUser) {
        throw new ForbiddenException('You do not have access to view this user\'s permissions');
      }
    }

    return this.permissionService.getEffectivePermissions(userId, scopeType, scopeId);
  }

  @Get('me/permissions')
  async getMyPermissions(
    @Request() req: any,
    @Query('scopeType') scopeType?: ScopeType,
    @Query('scopeId') scopeId?: string,
  ) {
    const user = req.user;
    return this.permissionService.getEffectivePermissions(
      user.id,
      scopeType || user.scopeType,
      scopeId || user.scopeId,
    );
  }

  @Get('me/check')
  async checkMyPermission(
    @Request() req: any,
    @Query('permission') permission: string,
    @Query('scopeType') scopeType?: ScopeType,
    @Query('scopeId') scopeId?: string,
  ) {
    const user = req.user;
    const hasPermission = await this.permissionService.hasPermission(
      user.id,
      permission,
      scopeType || user.scopeType,
      scopeId || user.scopeId,
    );
    return { hasPermission };
  }

  // ═══════════════════════════════════════════════════════════════
  // SESSIONS
  // ═══════════════════════════════════════════════════════════════

  @Get('me/sessions')
  async getMySessions(@Request() req: any) {
    return this.sessionService.getUserSessions(req.user.id);
  }

  @Delete('me/sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeMySession(@Param('sessionId') sessionId: string, @Request() req: any) {
    await this.sessionService.revokeSession(sessionId, req.user.id, 'User revoked session');
  }

  @Delete('me/sessions')
  async revokeAllMySessions(
    @Request() req: any,
    @Query('exceptCurrent') exceptCurrent?: string,
  ) {
    // Get current session from token (if available)
    const currentSessionId = exceptCurrent === 'true' ? req.headers['x-session-id'] : undefined;
    const count = await this.sessionService.revokeAllUserSessions(
      req.user.id,
      currentSessionId,
      req.user.id,
      'User revoked all sessions',
    );
    return { revokedCount: count };
  }

  @Get('users/:userId/sessions')
  @UseGuards(PermissionGuard)
  @RequirePermissions('users:manage')
  async getUserSessions(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify user can view the target user's sessions
    const userContext = this.toUserContext(user);
    const canManageUser = await this.hierarchyService.canManageUser(userContext, userId);
    if (!canManageUser) {
      throw new ForbiddenException('You do not have access to view this user\'s sessions');
    }

    return this.sessionService.getUserSessions(userId);
  }

  @Delete('users/:userId/sessions')
  @UseGuards(PermissionGuard)
  @RequirePermissions('users:manage')
  async revokeUserSessions(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify user can manage the target user's sessions
    const userContext = this.toUserContext(user);
    const canManageUser = await this.hierarchyService.canManageUser(userContext, userId);
    if (!canManageUser) {
      throw new ForbiddenException('You do not have access to manage this user\'s sessions');
    }

    const count = await this.sessionService.revokeAllUserSessions(
      userId,
      undefined,
      user.id,
      'Admin revoked all sessions',
    );
    return { revokedCount: count };
  }
}
