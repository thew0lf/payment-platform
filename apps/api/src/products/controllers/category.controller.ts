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
import { CategoryService, CreateCategoryDto, UpdateCategoryDto, CategoryTreeNode } from '../services/category.service';

@Controller('products/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const companyId = this.getCompanyId(user);
    return this.categoryService.findAll(companyId, includeInactive === 'true');
  }

  @Get('tree')
  async getTree(@CurrentUser() user: AuthenticatedUser): Promise<CategoryTreeNode[]> {
    const companyId = this.getCompanyId(user);
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
}
