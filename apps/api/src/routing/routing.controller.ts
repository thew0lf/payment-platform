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
export class RoutingController {
  constructor(private readonly service: RoutingRuleService) {}

  // ═══════════════════════════════════════════════════════════════
  // RULE CRUD
  // ═══════════════════════════════════════════════════════════════

  @Post()
  async create(
    @Body() dto: CreateRoutingRuleDto & { companyId: string; createdBy?: string },
  ): Promise<RoutingRule> {
    const { companyId, createdBy, ...createDto } = dto;
    return this.service.create(companyId, createDto, createdBy);
  }

  @Get()
  async findAll(
    @Query('companyId') companyId: string,
    @Query('status') status?: RuleStatus,
  ): Promise<RoutingRule[]> {
    return this.service.findAll(companyId, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<RoutingRule> {
    return this.service.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoutingRuleDto,
  ): Promise<RoutingRule> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // RULE EVALUATION
  // ═══════════════════════════════════════════════════════════════

  @Post('evaluate')
  async evaluate(
    @Body() body: { companyId: string; context: TransactionContext },
  ): Promise<RoutingDecision> {
    return this.service.evaluateTransaction(body.companyId, body.context);
  }

  @Post('test')
  async test(
    @Body() body: { companyId: string; context: TransactionContext },
  ): Promise<RoutingDecision> {
    return this.service.testRules(body.companyId, body.context);
  }

  // ═══════════════════════════════════════════════════════════════
  // RULE ORDERING
  // ═══════════════════════════════════════════════════════════════

  @Post('reorder')
  async reorder(
    @Body() body: { companyId: string; rules: Array<{ id: string; priority: number }> },
  ): Promise<{ success: boolean }> {
    await this.service.reorderRules(body.companyId, body.rules);
    return { success: true };
  }
}
