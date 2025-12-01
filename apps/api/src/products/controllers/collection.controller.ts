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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import {
  CollectionService,
  CreateCollectionDto,
  UpdateCollectionDto,
  Collection,
} from '../services/collection.service';

@Controller('products/collections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollectionController {
  constructor(
    private readonly collectionService: CollectionService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async create(
    @Body() dto: CreateCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Collection> {
    const companyId = this.getCompanyId(user);
    return this.collectionService.create(companyId, dto);
  }

  @Get()
  async findAll(
    @Query('includeInactive') includeInactive: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Collection[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      return []; // No company context, return empty
    }
    return this.collectionService.findAll(companyId, includeInactive === 'true');
  }

  @Get('featured')
  async getFeatured(@CurrentUser() user: AuthenticatedUser): Promise<Collection[]> {
    const companyId = this.getCompanyId(user);
    return this.collectionService.getFeatured(companyId);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Collection> {
    const companyId = this.getCompanyId(user);
    return this.collectionService.findById(companyId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Collection> {
    const companyId = this.getCompanyId(user);
    return this.collectionService.update(companyId, id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.collectionService.delete(companyId, id);
  }

  // ═══════════════════════════════════════════════════════════════
  // PRODUCTS
  // ═══════════════════════════════════════════════════════════════

  @Get(':id/products')
  async getProducts(
    @Param('id') id: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify user has company context - getCompanyId throws if user doesn't have company access
    this.getCompanyId(user);
    return this.collectionService.getProducts(
      id,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Post(':id/products')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async addProducts(
    @Param('id') id: string,
    @Body() body: { productIds: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.collectionService.addProducts(companyId, id, body.productIds);
  }

  @Delete(':id/products')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeProducts(
    @Param('id') id: string,
    @Body() body: { productIds: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.collectionService.removeProducts(companyId, id, body.productIds);
  }

  @Post(':id/products/reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async reorderProducts(
    @Param('id') id: string,
    @Body() body: { productIds: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.collectionService.reorderProducts(companyId, id, body.productIds);
  }

  @Post(':id/refresh')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.collectionService.refreshAutomaticCollection(companyId, id);
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

  private async getCompanyIdForQuery(user: AuthenticatedUser, queryCompanyId?: string): Promise<string | undefined> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    if (user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') {
      if (queryCompanyId) {
        const hasAccess = await this.hierarchyService.canAccessCompany(
          { sub: user.id, scopeType: user.scopeType as any, scopeId: user.scopeId, clientId: user.clientId, companyId: user.companyId },
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
