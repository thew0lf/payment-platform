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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';
import { PriceRuleService } from '../services/price-rule.service';
import {
  CreatePriceRuleDto,
  UpdatePriceRuleDto,
  CalculatePriceDto,
  ListPriceRulesQueryDto,
} from '../dto/price-rule.dto';

function toUserContext(user: AuthenticatedUser) {
  return {
    sub: user.id,
    scopeType: user.scopeType as ScopeType,
    scopeId: user.scopeId,
    organizationId: user.organizationId,
    clientId: user.clientId,
    companyId: user.companyId,
  };
}

@Controller('products/:productId/price-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PriceRuleController {
  constructor(private readonly priceRuleService: PriceRuleService) {}

  /**
   * List all price rules for a product
   */
  @Get()
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async listRules(
    @Param('productId') productId: string,
    @Query() query: ListPriceRulesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.priceRuleService.listRules(
      productId,
      toUserContext(user),
      query.activeOnly,
    );
  }

  /**
   * Create a new price rule
   */
  @Post()
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async createRule(
    @Param('productId') productId: string,
    @Body() dto: CreatePriceRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.priceRuleService.createRule(productId, dto, toUserContext(user));
  }

  /**
   * Update an existing price rule
   */
  @Patch(':ruleId')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async updateRule(
    @Param('productId') productId: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdatePriceRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.priceRuleService.updateRule(productId, ruleId, dto, toUserContext(user));
  }

  /**
   * Delete a price rule
   */
  @Delete(':ruleId')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(
    @Param('productId') productId: string,
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.priceRuleService.deleteRule(productId, ruleId, toUserContext(user));
  }

  /**
   * Calculate the final price with all applicable rules
   */
  @Post('calculate')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async calculatePrice(
    @Param('productId') productId: string,
    @Body() dto: CalculatePriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.priceRuleService.calculatePrice(productId, dto, toUserContext(user));
  }
}
