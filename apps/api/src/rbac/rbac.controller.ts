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
} from '@nestjs/common';
import { ScopeType, PermissionGrantType } from '@prisma/client';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { RequirePermissions, RequireAnyPermission } from './decorators/permissions.decorator';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { PermissionGrantService } from './services/permission-grant.service';
import { SessionService } from './services/session.service';
import {
  CreatePermissionDto,
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  GrantPermissionDto,
} from './types/rbac.types';

@Controller('rbac')
@UseGuards(CombinedAuthGuard)
export class RbacController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly roleService: RoleService,
    private readonly grantService: PermissionGrantService,
    private readonly sessionService: SessionService,
  ) {}

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
  ) {
    return this.roleService.findAll(scopeType, scopeId);
  }

  @Post('roles')
  @UseGuards(PermissionGuard)
  @RequirePermissions('roles:manage')
  async createRole(@Body() dto: CreateRoleDto, @Request() req: any) {
    return this.roleService.create(dto, req.user?.id);
  }

  @Get('roles/:id')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission('roles:read', 'roles:manage')
  async getRole(@Param('id') id: string) {
    return this.roleService.findById(id);
  }

  @Put('roles/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('roles:manage')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Request() req: any) {
    return this.roleService.update(id, dto, req.user?.id);
  }

  @Delete('roles/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('roles:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id') id: string, @Request() req: any) {
    await this.roleService.delete(id, req.user?.id);
  }

  @Put('roles/:id/permissions')
  @UseGuards(PermissionGuard)
  @RequirePermissions('roles:manage')
  async setRolePermissions(
    @Param('id') id: string,
    @Body() body: { permissionIds: string[] },
  ) {
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
  async assignRole(@Body() dto: AssignRoleDto, @Request() req: any) {
    await this.roleService.assignRole(dto, req.user?.id);
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
    @Request() req: any,
  ) {
    await this.roleService.unassignRole(userId, roleId, scopeType, scopeId, req.user?.id);
  }

  @Get('users/:userId/roles')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission('users:read', 'users:manage')
  async getUserRoles(
    @Param('userId') userId: string,
    @Query('scopeType') scopeType?: ScopeType,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.roleService.getUserRoles(userId, scopeType, scopeId);
  }

  // ═══════════════════════════════════════════════════════════════
  // PERMISSION GRANTS
  // ═══════════════════════════════════════════════════════════════

  @Post('grants')
  @UseGuards(PermissionGuard)
  @RequirePermissions('users:manage')
  async grantPermission(@Body() dto: GrantPermissionDto, @Request() req: any) {
    return this.grantService.grantPermission(dto, req.user?.id);
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
  ) {
    await this.grantService.revokeGrant(userId, permissionId, scopeType, scopeId);
  }

  @Get('users/:userId/grants')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission('users:read', 'users:manage')
  async getUserGrants(
    @Param('userId') userId: string,
    @Query('scopeType') scopeType?: ScopeType,
    @Query('scopeId') scopeId?: string,
  ) {
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
  ) {
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
  async getUserSessions(@Param('userId') userId: string) {
    return this.sessionService.getUserSessions(userId);
  }

  @Delete('users/:userId/sessions')
  @UseGuards(PermissionGuard)
  @RequirePermissions('users:manage')
  async revokeUserSessions(@Param('userId') userId: string, @Request() req: any) {
    const count = await this.sessionService.revokeAllUserSessions(
      userId,
      undefined,
      req.user.id,
      'Admin revoked all sessions',
    );
    return { revokedCount: count };
  }
}
