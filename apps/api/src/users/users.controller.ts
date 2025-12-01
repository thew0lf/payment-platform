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
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { User, UserStats } from './types/user.types';
import {
  UserQueryDto,
  InviteUserDto,
  UpdateUserDto,
  UpdateStatusDto,
  AssignRoleDto,
} from './dto/user.dto';
import { UserRole } from '@prisma/client';

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
    const scopeFilter = this.getScopeFilter(user);
    return this.usersService.findAll(scopeFilter, query);
  }

  @Get('stats')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async getStats(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserStats> {
    const scopeFilter = this.getScopeFilter(user);
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

    // Verify access to this user
    await this.verifyAccessToUser(user, result);

    return result;
  }

  @Post('invite')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async invite(
    @Body() dto: InviteUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<User> {
    // Verify the inviter has access to the scope they're inviting into
    await this.verifyScopeAccess(user, dto.scopeType, dto.scopeId);

    return this.usersService.invite(dto, user.id, user.role as UserRole);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<User> {
    // First get the user to verify access
    const targetUser = await this.usersService.findById(id);
    await this.verifyAccessToUser(user, targetUser);

    return this.usersService.update(id, dto, user.id, user.role as UserRole);
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<User> {
    // First get the user to verify access
    const targetUser = await this.usersService.findById(id);
    await this.verifyAccessToUser(user, targetUser);

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
    // Verify access to user and scope
    const targetUser = await this.usersService.findById(id);
    await this.verifyAccessToUser(user, targetUser);
    await this.verifyScopeAccess(user, dto.scopeType, dto.scopeId);

    return this.usersService.assignRole(id, dto.roleId, dto.scopeType, dto.scopeId, user.id);
  }

  @Delete(':id/roles/:roleId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    // Verify access to user
    const targetUser = await this.usersService.findById(id);
    await this.verifyAccessToUser(user, targetUser);

    return this.usersService.removeRole(id, roleId, user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get scope filter based on current user's access level
   */
  private getScopeFilter(user: AuthenticatedUser): {
    organizationId?: string;
    clientId?: string;
    companyId?: string;
  } {
    switch (user.scopeType) {
      case 'ORGANIZATION':
        return { organizationId: user.scopeId };
      case 'CLIENT':
        return { clientId: user.scopeId };
      case 'COMPANY':
        return { companyId: user.scopeId };
      default:
        // For department/team users, filter by their company
        if (user.companyId) {
          return { companyId: user.companyId };
        }
        throw new ForbiddenException('Unable to determine user scope');
    }
  }

  /**
   * Verify the current user has access to manage the target user
   */
  private async verifyAccessToUser(currentUser: AuthenticatedUser, targetUser: User): Promise<void> {
    // Organization admins can manage anyone in their org
    if (currentUser.scopeType === 'ORGANIZATION' && targetUser.organizationId === currentUser.scopeId) {
      return;
    }

    // Client admins can manage anyone in their client
    if (currentUser.scopeType === 'CLIENT' && targetUser.clientId === currentUser.scopeId) {
      return;
    }

    // Company admins can manage anyone in their company
    if (currentUser.scopeType === 'COMPANY' && targetUser.companyId === currentUser.scopeId) {
      return;
    }

    // Check if current user's company matches target's company
    if (currentUser.companyId && targetUser.companyId === currentUser.companyId) {
      return;
    }

    throw new ForbiddenException('You do not have access to manage this user');
  }

  /**
   * Verify the current user has access to a specific scope
   */
  private async verifyScopeAccess(
    user: AuthenticatedUser,
    scopeType: string,
    scopeId: string,
  ): Promise<void> {
    // Organization admins have access to everything in their org
    if (user.scopeType === 'ORGANIZATION') {
      // Verify the entity exists and is within the organization's scope
      const isValid = await this.hierarchyService.verifyEntityInOrganization(
        user.scopeId,
        scopeType,
        scopeId,
      );
      if (isValid) return;
      throw new ForbiddenException('Entity is not within your organization');
    }

    // Client admins have access to their client and companies within
    if (user.scopeType === 'CLIENT') {
      // Same client = access granted
      if (scopeType === 'CLIENT' && scopeId === user.scopeId) return;

      // For COMPANY scope, verify company belongs to their client
      if (scopeType === 'COMPANY') {
        const hasAccess = await this.hierarchyService.verifyCompanyInClient(
          user.scopeId,
          scopeId,
        );
        if (hasAccess) return;
      }

      // For DEPARTMENT scope, verify department is in a company belonging to their client
      if (scopeType === 'DEPARTMENT') {
        const hasAccess = await this.hierarchyService.canAccessCompany(
          { sub: user.id, scopeType: user.scopeType as any, scopeId: user.scopeId, clientId: user.clientId, companyId: user.companyId },
          scopeId,
        );
        if (hasAccess) return;
      }
    }

    // Company scope users can only access their company and below
    if (user.scopeType === 'COMPANY') {
      if (scopeType === 'COMPANY' && scopeId === user.scopeId) return;
      // For DEPARTMENT or TEAM within their company, would need additional validation
    }

    throw new ForbiddenException('You do not have access to this scope');
  }
}
