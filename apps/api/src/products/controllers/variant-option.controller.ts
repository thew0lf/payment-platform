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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { VariantOptionService } from '../services/variant-option.service';
import {
  CreateVariantOptionDto,
  UpdateVariantOptionDto,
  AddVariantOptionValueDto,
  ReorderOptionsDto,
  ReorderValuesDto,
} from '../dto/variant-option.dto';
import { ScopeType } from '@prisma/client';

// Helper to convert AuthenticatedUser to UserContext
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

@Controller('products/variant-options')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VariantOptionController {
  constructor(private readonly variantOptionService: VariantOptionService) {}

  /**
   * Get all variant options for a company
   */
  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')
  async findAll(
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.variantOptionService.findAll(effectiveCompanyId, toUserContext(user));
  }

  /**
   * Get a single variant option
   */
  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantOptionService.findOne(id, toUserContext(user));
  }

  /**
   * Create a new variant option
   */
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async create(
    @Query('companyId') companyId: string,
    @Body() dto: CreateVariantOptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.variantOptionService.create(effectiveCompanyId, dto, toUserContext(user));
  }

  /**
   * Update a variant option
   */
  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVariantOptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantOptionService.update(id, dto, toUserContext(user));
  }

  /**
   * Delete a variant option
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.variantOptionService.remove(id, toUserContext(user));
  }

  /**
   * Add a value to an option
   */
  @Post(':id/values')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async addValue(
    @Param('id') id: string,
    @Body() dto: AddVariantOptionValueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.variantOptionService.addValue(id, dto, toUserContext(user));
  }

  /**
   * Remove a value from an option
   */
  @Delete(':id/values/:valueId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeValue(
    @Param('id') id: string,
    @Param('valueId') valueId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.variantOptionService.removeValue(id, valueId, toUserContext(user));
  }

  /**
   * Reorder options within a company
   */
  @Post('reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderOptions(
    @Query('companyId') companyId: string,
    @Body() dto: ReorderOptionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    await this.variantOptionService.reorderOptions(effectiveCompanyId, dto, toUserContext(user));
  }

  /**
   * Reorder values within an option
   */
  @Post(':id/values/reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderValues(
    @Param('id') id: string,
    @Body() dto: ReorderValuesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.variantOptionService.reorderValues(id, dto, toUserContext(user));
  }
}
