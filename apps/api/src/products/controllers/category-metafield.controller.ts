/**
 * Category Metafield Controller
 * API endpoints for managing metafield definitions and product values
 * Part of Shopify-Inspired Product Management
 */

import {
  Controller,
  Get,
  Post,
  Put,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import {
  CategoryMetafieldService,
  CreateMetafieldDefinitionDto,
  UpdateMetafieldDefinitionDto,
  SetProductMetafieldValueDto,
  MetafieldDefinitionResponse,
  ProductMetafieldValueResponse,
} from '../services/category-metafield.service';

@Controller('products/categories/:categoryId/metafields')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryMetafieldController {
  constructor(
    private readonly metafieldService: CategoryMetafieldService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Create a new metafield definition for a category
   */
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async createDefinition(
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateMetafieldDefinitionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MetafieldDefinitionResponse> {
    const companyId = this.getCompanyId(user);
    return this.metafieldService.createDefinition(companyId, categoryId, dto);
  }

  /**
   * Get all metafield definitions for a category
   */
  @Get()
  async getDefinitions(
    @Param('categoryId') categoryId: string,
    @Query('includeInactive') includeInactive: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MetafieldDefinitionResponse[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      return [];
    }
    return this.metafieldService.getDefinitions(
      companyId,
      categoryId,
      includeInactive === 'true',
    );
  }

  /**
   * Get a single metafield definition
   */
  @Get(':id')
  async getDefinition(
    @Param('categoryId') categoryId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MetafieldDefinitionResponse> {
    const companyId = this.getCompanyId(user);
    return this.metafieldService.getDefinition(companyId, categoryId, id);
  }

  /**
   * Update a metafield definition
   */
  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateDefinition(
    @Param('categoryId') categoryId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMetafieldDefinitionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MetafieldDefinitionResponse> {
    const companyId = this.getCompanyId(user);
    return this.metafieldService.updateDefinition(companyId, categoryId, id, dto);
  }

  /**
   * Delete a metafield definition
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDefinition(
    @Param('categoryId') categoryId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.metafieldService.deleteDefinition(
      companyId,
      categoryId,
      id,
      user.id,
    );
  }

  /**
   * Reorder metafield definitions
   */
  @Post('reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async reorderDefinitions(
    @Param('categoryId') categoryId: string,
    @Body() body: { definitionIds: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MetafieldDefinitionResponse[]> {
    const companyId = this.getCompanyId(user);
    return this.metafieldService.reorderDefinitions(
      companyId,
      categoryId,
      body.definitionIds,
    );
  }

  private getCompanyId(user: AuthenticatedUser): string {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    throw new ForbiddenException('Company context required');
  }

  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string | undefined> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    if (user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') {
      if (queryCompanyId) {
        const hasAccess = await this.hierarchyService.canAccessCompany(
          {
            sub: user.id,
            scopeType: user.scopeType as any,
            scopeId: user.scopeId,
            clientId: user.clientId,
            companyId: user.companyId,
          },
          queryCompanyId,
        );
        if (!hasAccess) {
          throw new ForbiddenException('Access denied to the requested company');
        }
        return queryCompanyId;
      }
      return undefined;
    }
    return undefined;
  }
}

/**
 * Product Metafield Values Controller
 * Separate controller for product-level metafield operations
 */
@Controller('products/:productId/metafields')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductMetafieldController {
  constructor(
    private readonly metafieldService: CategoryMetafieldService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Get all metafield values for a product
   */
  @Get()
  async getProductMetafields(
    @Param('productId') productId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductMetafieldValueResponse[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      return [];
    }
    return this.metafieldService.getProductMetafields(companyId, productId);
  }

  /**
   * Set metafield values for a product
   */
  @Put()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async setProductMetafields(
    @Param('productId') productId: string,
    @Body() body: { values: SetProductMetafieldValueDto[] },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductMetafieldValueResponse[]> {
    const companyId = this.getCompanyId(user);
    return this.metafieldService.setProductMetafields(
      companyId,
      productId,
      body.values,
    );
  }

  /**
   * Delete a single metafield value for a product
   */
  @Delete(':definitionId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProductMetafield(
    @Param('productId') productId: string,
    @Param('definitionId') definitionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.metafieldService.deleteProductMetafield(
      companyId,
      productId,
      definitionId,
    );
  }

  private getCompanyId(user: AuthenticatedUser): string {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    throw new ForbiddenException('Company context required');
  }

  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string | undefined> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    if (user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') {
      if (queryCompanyId) {
        const hasAccess = await this.hierarchyService.canAccessCompany(
          {
            sub: user.id,
            scopeType: user.scopeType as any,
            scopeId: user.scopeId,
            clientId: user.clientId,
            companyId: user.companyId,
          },
          queryCompanyId,
        );
        if (!hasAccess) {
          throw new ForbiddenException('Access denied to the requested company');
        }
        return queryCompanyId;
      }
      return undefined;
    }
    return undefined;
  }
}
