import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { TagService, CreateTagDto, UpdateTagDto, Tag } from '../services/tag.service';

@Controller('products/tags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async create(
    @Body() dto: CreateTagDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Tag> {
    const companyId = this.getCompanyId(user);
    return this.tagService.create(companyId, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<Tag[]> {
    const companyId = this.getCompanyId(user);
    return this.tagService.findAll(companyId);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Tag> {
    const companyId = this.getCompanyId(user);
    return this.tagService.findById(companyId, id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Tag> {
    const companyId = this.getCompanyId(user);
    return this.tagService.update(companyId, id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const companyId = this.getCompanyId(user);
    return this.tagService.delete(companyId, id);
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
