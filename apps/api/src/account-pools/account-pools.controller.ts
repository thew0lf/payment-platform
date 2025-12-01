import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { AccountPoolService } from './services/account-pool.service';
import {
  CreateAccountPoolDto,
  UpdateAccountPoolDto,
  AddAccountToPoolDto,
  UpdatePoolMembershipDto,
  SelectAccountContext,
  AccountPool,
  AccountSelection,
} from './types';

@Controller('account-pools')
@UseGuards(JwtAuthGuard)
export class AccountPoolsController {
  constructor(
    private readonly accountPoolService: AccountPoolService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Verify user has access to a specific company
   */
  private async verifyCompanyAccess(user: AuthenticatedUser, companyId: string): Promise<void> {
    const hasAccess = await this.hierarchyService.canAccessCompany(
      {
        sub: user.id,
        scopeType: user.scopeType as any,
        scopeId: user.scopeId,
        organizationId: user.organizationId,
        clientId: user.clientId,
        companyId: user.companyId,
      },
      companyId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this company');
    }
  }

  /**
   * Get accessible company IDs for the user
   */
  private async getAccessibleCompanyIds(user: AuthenticatedUser): Promise<string[]> {
    return this.hierarchyService.getAccessibleCompanyIds({
      sub: user.id,
      scopeType: user.scopeType as any,
      scopeId: user.scopeId,
      organizationId: user.organizationId,
      clientId: user.clientId,
      companyId: user.companyId,
    });
  }

  // ==================== Pool CRUD ====================

  @Post()
  async create(
    @Body() dto: CreateAccountPoolDto & { companyId: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AccountPool> {
    const { companyId, ...createDto } = dto;
    await this.verifyCompanyAccess(user, companyId);
    return this.accountPoolService.create(companyId, createDto);
  }

  @Get()
  async findAll(
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AccountPool[]> {
    await this.verifyCompanyAccess(user, companyId);
    return this.accountPoolService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AccountPool> {
    // Note: Service should validate company access on the returned pool
    return this.accountPoolService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountPoolDto
  ): Promise<AccountPool> {
    // Note: Service should validate company access on the pool being updated
    return this.accountPoolService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    // Note: Service should validate company access on the pool being deleted
    return this.accountPoolService.delete(id);
  }

  // ==================== Membership Management ====================

  @Post(':id/accounts')
  async addAccount(
    @Param('id') poolId: string,
    @Body() dto: AddAccountToPoolDto
  ): Promise<AccountPool> {
    // Note: Service should validate company access on the pool
    return this.accountPoolService.addAccount(poolId, dto);
  }

  @Delete(':id/accounts/:accountId')
  async removeAccount(
    @Param('id') poolId: string,
    @Param('accountId') accountId: string
  ): Promise<AccountPool> {
    // Note: Service should validate company access on the pool
    return this.accountPoolService.removeAccount(poolId, accountId);
  }

  @Patch(':id/accounts/:accountId')
  async updateMembership(
    @Param('id') poolId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdatePoolMembershipDto
  ): Promise<AccountPool> {
    // Note: Service should validate company access on the pool
    return this.accountPoolService.updateMembership(poolId, accountId, dto);
  }

  @Post(':id/accounts/:accountId/exclude')
  async excludeAccount(
    @Param('id') poolId: string,
    @Param('accountId') accountId: string,
    @Body() body: { durationMs: number; reason: string }
  ): Promise<AccountPool> {
    // Note: Service should validate company access on the pool
    return this.accountPoolService.excludeAccount(
      poolId,
      accountId,
      body.durationMs,
      body.reason
    );
  }

  // ==================== Account Selection ====================

  @Post(':id/select')
  async selectAccount(
    @Param('id') poolId: string,
    @Body() context: SelectAccountContext
  ): Promise<AccountSelection> {
    // Note: Service should validate company access on the pool
    return this.accountPoolService.selectAccount(poolId, context);
  }

  @Post(':id/select-with-failover')
  async selectWithFailover(
    @Param('id') poolId: string,
    @Body() body: { context: SelectAccountContext; failedAccountIds?: string[] }
  ): Promise<AccountSelection> {
    // Note: Service should validate company access on the pool
    return this.accountPoolService.selectWithFailover(
      poolId,
      body.context,
      body.failedAccountIds
    );
  }
}
