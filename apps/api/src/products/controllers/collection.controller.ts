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
import {
  CollectionService,
  CreateCollectionDto,
  UpdateCollectionDto,
  Collection,
} from '../services/collection.service';

@Controller('products/collections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Collection[]> {
    const companyId = this.getCompanyId(user);
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
  ) {
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
}
