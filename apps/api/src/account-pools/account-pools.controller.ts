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
} from '@nestjs/common';
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
export class AccountPoolsController {
  constructor(private readonly accountPoolService: AccountPoolService) {}

  // ==================== Pool CRUD ====================

  @Post()
  async create(
    @Body() dto: CreateAccountPoolDto & { companyId: string }
  ): Promise<AccountPool> {
    const { companyId, ...createDto } = dto;
    return this.accountPoolService.create(companyId, createDto);
  }

  @Get()
  async findAll(@Query('companyId') companyId: string): Promise<AccountPool[]> {
    return this.accountPoolService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AccountPool> {
    return this.accountPoolService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountPoolDto
  ): Promise<AccountPool> {
    return this.accountPoolService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.accountPoolService.delete(id);
  }

  // ==================== Membership Management ====================

  @Post(':id/accounts')
  async addAccount(
    @Param('id') poolId: string,
    @Body() dto: AddAccountToPoolDto
  ): Promise<AccountPool> {
    return this.accountPoolService.addAccount(poolId, dto);
  }

  @Delete(':id/accounts/:accountId')
  async removeAccount(
    @Param('id') poolId: string,
    @Param('accountId') accountId: string
  ): Promise<AccountPool> {
    return this.accountPoolService.removeAccount(poolId, accountId);
  }

  @Patch(':id/accounts/:accountId')
  async updateMembership(
    @Param('id') poolId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdatePoolMembershipDto
  ): Promise<AccountPool> {
    return this.accountPoolService.updateMembership(poolId, accountId, dto);
  }

  @Post(':id/accounts/:accountId/exclude')
  async excludeAccount(
    @Param('id') poolId: string,
    @Param('accountId') accountId: string,
    @Body() body: { durationMs: number; reason: string }
  ): Promise<AccountPool> {
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
    return this.accountPoolService.selectAccount(poolId, context);
  }

  @Post(':id/select-with-failover')
  async selectWithFailover(
    @Param('id') poolId: string,
    @Body() body: { context: SelectAccountContext; failedAccountIds?: string[] }
  ): Promise<AccountSelection> {
    return this.accountPoolService.selectWithFailover(
      poolId,
      body.context,
      body.failedAccountIds
    );
  }
}
