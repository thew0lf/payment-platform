/**
 * Sales Channel Controller
 * API endpoints for managing sales channels and product publishing
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
  SalesChannelService,
  CreateSalesChannelDto,
  UpdateSalesChannelDto,
  PublishProductToChannelDto,
  BulkPublishDto,
  SalesChannelResponse,
  ProductChannelResponse,
} from '../services/sales-channel.service';

@Controller('sales-channels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesChannelController {
  constructor(
    private readonly salesChannelService: SalesChannelService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Create a new sales channel
   */
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async create(
    @Body() dto: CreateSalesChannelDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SalesChannelResponse> {
    const companyId = this.getCompanyId(user);
    return this.salesChannelService.create(companyId, dto);
  }

  /**
   * Get all sales channels for a company
   */
  @Get()
  async findAll(
    @Query('includeInactive') includeInactive: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SalesChannelResponse[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      return [];
    }
    return this.salesChannelService.findAll(
      companyId,
      includeInactive === 'true',
    );
  }

  /**
   * Get a single sales channel by ID
   */
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SalesChannelResponse> {
    const companyId = this.getCompanyId(user);
    return this.salesChannelService.findById(companyId, id);
  }

  /**
   * Update a sales channel
   */
  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSalesChannelDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SalesChannelResponse> {
    const companyId = this.getCompanyId(user);
    return this.salesChannelService.update(companyId, id, dto);
  }

  /**
   * Delete a sales channel
   */
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.salesChannelService.delete(companyId, id, user.id);
  }

  /**
   * Reorder sales channels
   */
  @Post('reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async reorder(
    @Body() body: { channelIds: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SalesChannelResponse[]> {
    const companyId = this.getCompanyId(user);
    return this.salesChannelService.reorder(companyId, body.channelIds);
  }

  /**
   * Get all products published to a channel
   */
  @Get(':id/products')
  async getChannelProducts(
    @Param('id') id: string,
    @Query('publishedOnly') publishedOnly: string,
    @Query('visibleOnly') visibleOnly: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ products: any[]; total: number }> {
    const companyId = this.getCompanyId(user);
    return this.salesChannelService.getChannelProducts(companyId, id, {
      publishedOnly: publishedOnly === 'true',
      visibleOnly: visibleOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Bulk publish products to a channel
   */
  @Post('bulk-publish')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async bulkPublish(
    @Body() dto: BulkPublishDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: number; failed: number }> {
    const companyId = this.getCompanyId(user);
    return this.salesChannelService.bulkPublish(companyId, dto);
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
 * Product Sales Channels Controller
 * Endpoints for managing a product's channel publishing
 */
@Controller('products/:productId/channels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductChannelsController {
  constructor(
    private readonly salesChannelService: SalesChannelService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Get all channels a product is published to
   */
  @Get()
  async getProductChannels(
    @Param('productId') productId: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductChannelResponse[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      return [];
    }
    return this.salesChannelService.getProductChannels(companyId, productId);
  }

  /**
   * Publish a product to a channel
   */
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async publishToChannel(
    @Param('productId') productId: string,
    @Body() dto: PublishProductToChannelDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductChannelResponse> {
    const companyId = this.getCompanyId(user);
    return this.salesChannelService.publishToChannel(companyId, productId, dto);
  }

  /**
   * Update all channel assignments for a product
   */
  @Put()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateProductChannels(
    @Param('productId') productId: string,
    @Body() body: { channels: PublishProductToChannelDto[] },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductChannelResponse[]> {
    const companyId = this.getCompanyId(user);
    return this.salesChannelService.updateProductChannels(
      companyId,
      productId,
      body.channels,
    );
  }

  /**
   * Unpublish a product from a channel
   */
  @Delete(':channelId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unpublishFromChannel(
    @Param('productId') productId: string,
    @Param('channelId') channelId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.salesChannelService.unpublishFromChannel(
      companyId,
      productId,
      channelId,
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
