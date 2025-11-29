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
import { CategoryService, CreateCategoryDto, UpdateCategoryDto, CategoryTreeNode } from '../services/category.service';

@Controller('products/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = this.getCompanyId(user);
    return this.categoryService.create(companyId, dto);
  }

  @Get()
  async findAll(
    @Query('includeInactive') includeInactive: string,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      return [];
    }
    return this.categoryService.findAll(companyId, includeInactive === 'true');
  }

  @Get('tree')
  async getTree(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CategoryTreeNode[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    if (!companyId) {
      return [];
    }
    return this.categoryService.getTree(companyId);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = this.getCompanyId(user);
    return this.categoryService.findById(companyId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = this.getCompanyId(user);
    return this.categoryService.update(companyId, id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.categoryService.delete(companyId, id);
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
