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
import { RoutingRuleService } from './services/routing-rule.service';
import {
  CreateRoutingRuleDto,
  UpdateRoutingRuleDto,
  RuleStatus,
  TransactionContext,
  RoutingRule,
  RoutingDecision,
} from './types/routing-rule.types';

@Controller('routing-rules')
@UseGuards(JwtAuthGuard)
export class RoutingController {
  constructor(
    private readonly service: RoutingRuleService,
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

  // ═══════════════════════════════════════════════════════════════
  // RULE CRUD
  // ═══════════════════════════════════════════════════════════════

  @Post()
  async create(
    @Body() dto: CreateRoutingRuleDto & { companyId: string; createdBy?: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoutingRule> {
    const { companyId, createdBy, ...createDto } = dto;
    await this.verifyCompanyAccess(user, companyId);
    return this.service.create(companyId, createDto, createdBy || user.id);
  }

  @Get()
  async findAll(
    @Query('companyId') companyId: string,
    @Query('status') status?: RuleStatus,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<RoutingRule[]> {
    if (companyId && user) {
      await this.verifyCompanyAccess(user, companyId);
    }
    return this.service.findAll(companyId, status);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoutingRule> {
    // Security: First fetch the rule, then verify access to its company
    const rule = await this.service.findById(id);
    await this.verifyCompanyAccess(user, rule.companyId);
    return rule;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoutingRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoutingRule> {
    // Security: Verify access to the rule's company before updating
    const rule = await this.service.findById(id);
    await this.verifyCompanyAccess(user, rule.companyId);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    // Security: Verify access to the rule's company before deleting
    const rule = await this.service.findById(id);
    await this.verifyCompanyAccess(user, rule.companyId);
    return this.service.delete(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // RULE EVALUATION
  // ═══════════════════════════════════════════════════════════════

  @Post('evaluate')
  async evaluate(
    @Body() body: { companyId: string; context: TransactionContext },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoutingDecision> {
    await this.verifyCompanyAccess(user, body.companyId);
    return this.service.evaluateTransaction(body.companyId, body.context);
  }

  @Post('test')
  async test(
    @Body() body: { companyId: string; context: TransactionContext },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoutingDecision> {
    await this.verifyCompanyAccess(user, body.companyId);
    return this.service.testRules(body.companyId, body.context);
  }

  // ═══════════════════════════════════════════════════════════════
  // RULE ORDERING
  // ═══════════════════════════════════════════════════════════════

  @Post('reorder')
  async reorder(
    @Body() body: { companyId: string; rules: Array<{ id: string; priority: number }> },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    await this.verifyCompanyAccess(user, body.companyId);
    await this.service.reorderRules(body.companyId, body.rules);
    return { success: true };
  }
}
