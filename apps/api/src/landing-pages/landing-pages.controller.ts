import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { LandingPagesService } from './services/landing-pages.service';
import { DeployService } from './services/deploy.service';
import {
  CreateLandingPageDto,
  UpdateLandingPageDto,
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
  AddCustomDomainDto,
  RequestSubdomainDto,
  LandingPageSummary,
  LandingPageDetail,
  DeploymentResult,
} from './types/landing-page.types';
import { LandingPageTheme } from '@prisma/client';

@Controller('landing-pages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LandingPagesController {
  constructor(
    private readonly landingPagesService: LandingPagesService,
    private readonly deployService: DeployService,
  ) {}

  private getCompanyId(user: AuthenticatedUser): string {
    if (!user.companyId) {
      throw new ForbiddenException('User must be associated with a company');
    }
    return user.companyId;
  }

  // ═══════════════════════════════════════════════════════════════
  // LANDING PAGE CRUD
  // ═══════════════════════════════════════════════════════════════

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<LandingPageSummary[]> {
    const companyId = this.getCompanyId(user);
    return this.landingPagesService.findAll(companyId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<LandingPageDetail> {
    const companyId = this.getCompanyId(user);
    return this.landingPagesService.findOne(companyId, id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLandingPageDto,
  ): Promise<LandingPageDetail> {
    const companyId = this.getCompanyId(user);
    return this.landingPagesService.create(companyId, dto, user.id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLandingPageDto,
  ): Promise<LandingPageDetail> {
    const companyId = this.getCompanyId(user);
    return this.landingPagesService.update(companyId, id, dto, user.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const companyId = this.getCompanyId(user);
    await this.landingPagesService.delete(companyId, id, user.id);
    return { success: true };
  }

  @Post(':id/duplicate')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async duplicate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { name: string },
  ): Promise<LandingPageDetail> {
    const companyId = this.getCompanyId(user);
    return this.landingPagesService.duplicate(companyId, id, body.name, user.id);
  }

  @Post('from-template')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async createFromTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: {
      templateId: string;
      name: string;
      slug: string;
      theme?: LandingPageTheme;
    },
  ): Promise<LandingPageDetail> {
    const companyId = this.getCompanyId(user);

    // If 'blank' template, use the createBlankPage method
    if (body.templateId === 'blank') {
      return this.landingPagesService.createBlankPage(
        companyId,
        body.name,
        body.slug,
        body.theme || LandingPageTheme.STARTER,
        user.id,
      );
    }

    return this.landingPagesService.createFromTemplate(
      companyId,
      body.templateId,
      body.name,
      body.slug,
      user.id,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════════════════════════════════

  @Post(':id/sections')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async addSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateSectionDto,
  ): Promise<LandingPageDetail> {
    const companyId = this.getCompanyId(user);
    return this.landingPagesService.addSection(companyId, id, dto);
  }

  @Put(':id/sections/:sectionId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<LandingPageDetail> {
    const companyId = this.getCompanyId(user);
    return this.landingPagesService.updateSection(companyId, id, sectionId, dto);
  }

  @Delete(':id/sections/:sectionId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async deleteSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
  ): Promise<LandingPageDetail> {
    const companyId = this.getCompanyId(user);
    return this.landingPagesService.deleteSection(companyId, id, sectionId);
  }

  @Patch(':id/sections/reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async reorderSections(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReorderSectionsDto,
  ): Promise<LandingPageDetail> {
    const companyId = this.getCompanyId(user);
    return this.landingPagesService.reorderSections(companyId, id, dto.sectionIds);
  }

  // ═══════════════════════════════════════════════════════════════
  // DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════

  @Post(':id/deploy')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async deploy(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { html: string; assets?: { key: string; content: string; contentType: string }[] },
  ): Promise<DeploymentResult> {
    const companyId = this.getCompanyId(user);
    // Convert base64 assets to buffers
    const assets = (body.assets || []).map(asset => ({
      key: asset.key,
      content: Buffer.from(asset.content, 'base64'),
      contentType: asset.contentType,
    }));

    return this.deployService.deployToPlatform(companyId, id, body.html, assets);
  }

  @Post(':id/unpublish')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async unpublish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const companyId = this.getCompanyId(user);
    await this.deployService.unpublish(companyId, id);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // DOMAINS
  // ═══════════════════════════════════════════════════════════════

  @Post(':id/subdomain')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async requestSubdomain(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RequestSubdomainDto,
  ): Promise<{ subdomain: string; fullDomain: string }> {
    const companyId = this.getCompanyId(user);
    return this.deployService.requestSubdomain(companyId, id, dto);
  }

  @Post(':id/domains')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async addCustomDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddCustomDomainDto,
  ): Promise<{ domain: string; validationRecords: { name: string; type: string; value: string }[] }> {
    const companyId = this.getCompanyId(user);
    return this.deployService.addCustomDomain(companyId, id, dto);
  }

  @Get(':id/domains/:domainId/status')
  async checkDomainStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('domainId') domainId: string,
  ): Promise<{ status: string }> {
    const companyId = this.getCompanyId(user);
    const status = await this.deployService.checkDomainSslStatus(companyId, id, domainId);
    return { status };
  }

  @Delete(':id/domains/:domainId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async removeCustomDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('domainId') domainId: string,
  ): Promise<{ success: boolean }> {
    const companyId = this.getCompanyId(user);
    await this.deployService.removeCustomDomain(companyId, id, domainId);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // THEMES & TEMPLATES
  // ═══════════════════════════════════════════════════════════════

  @Get('meta/themes')
  async getThemes(): Promise<{ theme: LandingPageTheme; name: string; description: string }[]> {
    return [
      { theme: LandingPageTheme.STARTER, name: 'Starter', description: 'Clean, minimal design for any business' },
      { theme: LandingPageTheme.ARTISAN, name: 'Artisan', description: 'Warm, handcrafted feel for artisanal products' },
      { theme: LandingPageTheme.VELOCITY, name: 'Velocity', description: 'Bold, dynamic design for tech and sports' },
      { theme: LandingPageTheme.LUXE, name: 'Luxe', description: 'Elegant, premium aesthetic for luxury brands' },
      { theme: LandingPageTheme.WELLNESS, name: 'Wellness', description: 'Calm, natural design for health and wellness' },
      { theme: LandingPageTheme.FOODIE, name: 'Foodie', description: 'Appetizing design for food and beverage' },
      { theme: LandingPageTheme.PROFESSIONAL, name: 'Professional', description: 'Corporate, trustworthy design for B2B' },
      { theme: LandingPageTheme.CREATOR, name: 'Creator', description: 'Creative, expressive design for content creators' },
      { theme: LandingPageTheme.MARKETPLACE, name: 'Marketplace', description: 'Functional design for e-commerce' },
    ];
  }

  @Get('meta/templates')
  async getTemplates(): Promise<{ id: string; name: string; description: string; theme: string; thumbnail?: string }[]> {
    const templates = this.landingPagesService.getTemplates();
    return [
      // Add blank option first
      {
        id: 'blank',
        name: 'Blank Page',
        description: 'Start from scratch with just header, hero, and footer',
        theme: 'STARTER',
      },
      // Add all pre-built templates
      ...templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        theme: t.theme,
        thumbnail: t.thumbnail,
      })),
    ];
  }
}
