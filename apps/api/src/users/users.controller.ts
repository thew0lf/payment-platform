import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './services/users.service';
import { HierarchyService, UserContext } from '../hierarchy/hierarchy.service';
import { User, UserStats } from './types/user.types';
import {
  UserQueryDto,
  InviteUserDto,
  UpdateUserDto,
  UpdateStatusDto,
  AssignRoleDto,
} from './dto/user.dto';
import { UserRole, ScopeType } from '@prisma/client';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // LIST & STATS
  // ═══════════════════════════════════════════════════════════════

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async findAll(
    @Query() query: UserQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ users: User[]; total: number }> {
    const userContext = this.toUserContext(user);
    const scopeFilter = await this.hierarchyService.getUserScopeFilter(userContext);
    return this.usersService.findAll(scopeFilter, query);
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getStats(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserStats> {
    const userContext = this.toUserContext(user);
    const scopeFilter = await this.hierarchyService.getUserScopeFilter(userContext);
    return this.usersService.getStats(scopeFilter);
  }

  // ═══════════════════════════════════════════════════════════════
  // CRUD
  // ═══════════════════════════════════════════════════════════════

  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<User> {
    const result = await this.usersService.findById(id);

    // Verify access to this user using hierarchical check
    const userContext = this.toUserContext(user);
    const canAccess = await this.hierarchyService.canManageUser(userContext, id);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to view this user');
    }

    return result;
  }

  @Post('invite')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async invite(
    @Body() dto: InviteUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<User> {
    // Verify the inviter has access to the scope they're inviting into
    const userContext = this.toUserContext(user);
    const canInvite = await this.hierarchyService.canInviteToScope(
      userContext,
      dto.scopeType as ScopeType,
      dto.scopeId,
    );
    if (!canInvite) {
      throw new ForbiddenException('You cannot invite users into this scope');
    }

    return this.usersService.invite(dto, user.id, user.role as UserRole);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<User> {
    // Verify access to manage this user
    const userContext = this.toUserContext(user);
    const canManage = await this.hierarchyService.canManageUser(userContext, id);
    if (!canManage) {
      throw new ForbiddenException('You do not have access to manage this user');
    }

    return this.usersService.update(id, dto, user.id, user.role as UserRole);
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<User> {
    // Verify access to manage this user
    const userContext = this.toUserContext(user);
    const canManage = await this.hierarchyService.canManageUser(userContext, id);
    if (!canManage) {
      throw new ForbiddenException('You do not have access to manage this user');
    }

    return this.usersService.updateStatus(id, dto.status, user.id, user.role as UserRole);
  }

  // ═══════════════════════════════════════════════════════════════
  // ROLE ASSIGNMENT
  // ═══════════════════════════════════════════════════════════════

  @Post(':id/roles')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const userContext = this.toUserContext(user);

    // Verify access to manage the target user
    const canManage = await this.hierarchyService.canManageUser(userContext, id);
    if (!canManage) {
      throw new ForbiddenException('You do not have access to manage this user');
    }

    // Verify access to assign role in the specified scope
    const canInvite = await this.hierarchyService.canInviteToScope(
      userContext,
      dto.scopeType,
      dto.scopeId,
    );
    if (!canInvite) {
      throw new ForbiddenException('You cannot assign roles in this scope');
    }

    return this.usersService.assignRole(
      id,
      dto.roleId,
      dto.scopeType,
      dto.scopeId,
      user.id,
      user.scopeType as ScopeType,
      user.scopeId,
    );
  }

  @Delete(':id/roles/:roleId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    // Verify access to manage the target user
    const userContext = this.toUserContext(user);
    const canManage = await this.hierarchyService.canManageUser(userContext, id);
    if (!canManage) {
      throw new ForbiddenException('You do not have access to manage this user');
    }

    return this.usersService.removeRole(
      id,
      roleId,
      user.id,
      user.scopeType as ScopeType,
      user.scopeId,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Convert AuthenticatedUser to UserContext for HierarchyService methods
   */
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
}
