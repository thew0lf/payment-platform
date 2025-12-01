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
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { MerchantAccountService } from './services/merchant-account.service';
import {
  CreateMerchantAccountDto,
  UpdateMerchantAccountDto,
  MerchantAccountQuery,
  MerchantAccount,
  PaymentProviderType,
  AccountStatus,
} from './types/merchant-account.types';

@ApiTags('Merchant Accounts')
@ApiBearerAuth()
@Controller('merchant-accounts')
@UseGuards(JwtAuthGuard)
export class MerchantAccountsController {
  constructor(
    private readonly service: MerchantAccountService,
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
   * Verify merchant account belongs to user's accessible companies
   */
  private async verifyAccountAccess(user: AuthenticatedUser, accountId: string): Promise<MerchantAccount> {
    const account = await this.service.findById(accountId);
    if (!account) {
      throw new NotFoundException('Merchant account not found');
    }
    await this.verifyCompanyAccess(user, account.companyId);
    return account;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new merchant account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  async create(
    @Request() req,
    @Body() dto: CreateMerchantAccountDto,
  ): Promise<MerchantAccount> {
    const companyId = this.getCompanyId(req);
    return this.service.create(companyId, dto, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List merchant accounts' })
  async findAll(
    @Request() req,
    @Query('providerType') providerType?: PaymentProviderType,
    @Query('status') status?: AccountStatus,
    @Query('tags') tags?: string,
    @Query('isDefault') isDefault?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('companyId') queryCompanyId?: string,
  ): Promise<{ accounts: MerchantAccount[]; total: number }> {
    // For ORGANIZATION level users, allow filtering by companyId from query
    // For COMPANY level users, use their companyId
    const companyId = this.getCompanyIdOptional(req, queryCompanyId);
    const query: MerchantAccountQuery = {
      companyId,
      providerType,
      status,
      tags: tags?.split(','),
      isDefault: isDefault === 'true' ? true : isDefault === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get merchant account by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MerchantAccount> {
    return this.verifyAccountAccess(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update merchant account' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MerchantAccount> {
    await this.verifyAccountAccess(user, id);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete merchant account' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.verifyAccountAccess(user, id);
    return this.service.delete(id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get account usage statistics' })
  async getUsage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyAccountAccess(user, id);
    return this.service.getUsage(id);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Get account health status' })
  async getHealth(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyAccountAccess(user, id);
    return this.service.getHealth(id);
  }

  @Post(':id/check-limits')
  @ApiOperation({ summary: 'Check if transaction is within limits' })
  async checkLimits(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyAccountAccess(user, id);
    return this.service.checkLimits(id, amount);
  }

  private getCompanyId(req: any): string {
    if (req.user?.companyId) return req.user.companyId;
    throw new Error('Company ID required');
  }

  private getCompanyIdOptional(req: any, queryCompanyId?: string): string | undefined {
    // If user is ORGANIZATION level, they can view all accounts or filter by companyId
    if (req.user?.scopeType === 'ORGANIZATION') {
      return queryCompanyId || undefined; // undefined = all accounts
    }
    // If user is CLIENT level, they can view accounts for companies in their client
    if (req.user?.scopeType === 'CLIENT') {
      return queryCompanyId || undefined; // Service should filter by clientId
    }
    // For COMPANY level users, always use their companyId
    return req.user?.companyId;
  }
}
