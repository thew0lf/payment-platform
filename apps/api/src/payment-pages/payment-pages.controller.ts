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
  Headers,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaymentPagesService, PaymentPageFilters } from './services/payment-pages.service';
import { ThemesService, ThemeFilters } from './services/themes.service';
import { SessionsService } from './services/sessions.service';
import { DomainsService, CreateDomainDto, UpdateDomainDto } from './services/domains.service';
import { InsightsService } from './services/insights.service';
import { PciComplianceService } from './services/pci-compliance.service';
import {
  CreatePaymentPageDto,
  UpdatePaymentPageDto,
  CreateThemeDto,
  CreateSessionDto,
} from './dto';
import {
  PaymentPageStatus,
  PaymentPageType,
  CheckoutPageThemeCategory,
  PaymentSessionStatus,
  PaymentGatewayType,
} from '@prisma/client';
import { SessionDeviceInfo } from './types';

// ═══════════════════════════════════════════════════════════════
// PAYMENT PAGES CONTROLLER (Admin endpoints)
// ═══════════════════════════════════════════════════════════════

@ApiTags('Payment Pages')
@Controller('payment-pages')
export class PaymentPagesController {
  constructor(
    private readonly pagesService: PaymentPagesService,
    private readonly themesService: ThemesService,
    private readonly sessionsService: SessionsService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Payment Pages CRUD
  // ─────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List payment pages' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PaymentPageStatus })
  @ApiQuery({ name: 'type', required: false, enum: PaymentPageType })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async list(
    @Query('companyId') companyId: string,
    @Query('search') search?: string,
    @Query('status') status?: PaymentPageStatus,
    @Query('type') type?: PaymentPageType,
    @Query('themeId') themeId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user?.companyId;
    if (!effectiveCompanyId) {
      return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }

    const filters: PaymentPageFilters = { search, status, type, themeId };
    return this.pagesService.findAll(
      effectiveCompanyId,
      filters,
      parseInt(page || '1', 10),
      parseInt(pageSize || '20', 10),
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment page statistics' })
  async getStats(
    @Query('companyId') companyId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user?.companyId;
    if (!effectiveCompanyId) {
      return {
        total: 0,
        published: 0,
        draft: 0,
        archived: 0,
        totalSessions: 0,
        completedSessions: 0,
        conversionRate: 0,
        totalRevenue: 0,
      };
    }

    return this.pagesService.getStats(effectiveCompanyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment page by ID' })
  async findById(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user?.companyId;
    return this.pagesService.findById(id, effectiveCompanyId!);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment page' })
  @ApiResponse({ status: 201, description: 'Payment page created' })
  async create(
    @Body() dto: CreatePaymentPageDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.pagesService.create(effectiveCompanyId!, dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update payment page' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentPageDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.pagesService.update(id, effectiveCompanyId!, dto, user.id);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish payment page' })
  async publish(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.pagesService.publish(id, effectiveCompanyId!, user.id);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive payment page' })
  async archive(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.pagesService.archive(id, effectiveCompanyId!, user.id);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate payment page' })
  async duplicate(
    @Param('id') id: string,
    @Body() body: { name: string; slug: string },
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.pagesService.duplicate(
      id,
      effectiveCompanyId!,
      body.name,
      body.slug,
      user.id,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete payment page' })
  async delete(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    await this.pagesService.delete(id, effectiveCompanyId!, user.id);
  }

  // ─────────────────────────────────────────────────────────────
  // Preview
  // ─────────────────────────────────────────────────────────────

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get preview data for a payment page (any status)' })
  @ApiResponse({ status: 200, description: 'Returns page preview configuration' })
  async getPreview(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.pagesService.getPreview(id, effectiveCompanyId!);
  }

  // ─────────────────────────────────────────────────────────────
  // Sessions (Admin view)
  // ─────────────────────────────────────────────────────────────

  @Get(':id/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sessions for a payment page' })
  @ApiQuery({ name: 'status', required: false, enum: PaymentSessionStatus })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async getPageSessions(
    @Param('id') pageId: string,
    @Query('status') status?: PaymentSessionStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sessionsService.getSessionsForPage(
      pageId,
      { status },
      parseInt(page || '1', 10),
      parseInt(pageSize || '20', 10),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// THEMES CONTROLLER
// ═══════════════════════════════════════════════════════════════

@ApiTags('Payment Page Themes')
@Controller('payment-pages/themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available themes' })
  @ApiQuery({ name: 'category', required: false, enum: CheckoutPageThemeCategory })
  @ApiQuery({ name: 'search', required: false })
  async list(
    @Query('category') category?: CheckoutPageThemeCategory,
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user?.companyId;
    const filters: ThemeFilters = { category, search };
    return this.themesService.findAll(filters, effectiveCompanyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get theme by ID' })
  async findById(@Param('id') id: string) {
    return this.themesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create custom theme' })
  async create(
    @Body() dto: CreateThemeDto,
    @Query('companyId') companyId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user?.companyId;
    return this.themesService.create(dto, effectiveCompanyId, user?.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update theme' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateThemeDto>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.themesService.update(id, dto, user?.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete custom theme' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    await this.themesService.delete(id, user?.id);
  }

  @Post('seed-system')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed system themes (admin only)' })
  async seedSystemThemes() {
    return this.themesService.seedSystemThemes();
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC CHECKOUT CONTROLLER (Customer-facing)
// ═══════════════════════════════════════════════════════════════

@ApiTags('Checkout Sessions')
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly pagesService: PaymentPagesService,
    private readonly sessionsService: SessionsService,
  ) {}

  @Get('page/:companyCode/:slug')
  @ApiOperation({ summary: 'Get public payment page by company code and slug' })
  @ApiResponse({ status: 200, description: 'Returns public payment page configuration' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async getPublicPage(
    @Param('companyCode') companyCode: string,
    @Param('slug') slug: string,
  ) {
    return this.pagesService.findPublicPage(companyCode, slug);
  }

  @Get('domain/:domain')
  @ApiOperation({ summary: 'Get payment page by custom domain' })
  @ApiResponse({ status: 200, description: 'Returns payment page for domain' })
  @ApiResponse({ status: 404, description: 'Domain not configured' })
  async getPageByDomain(@Param('domain') domain: string) {
    return this.pagesService.findByDomain(domain);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create a checkout session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(
    @Body() dto: CreateSessionDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    const deviceInfo: SessionDeviceInfo = {
      userAgent,
      ip,
    };

    const session = await this.sessionsService.create(dto, deviceInfo);

    return {
      sessionId: session.id,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      checkoutUrl: `/checkout/s/${session.sessionToken}`,
    };
  }

  @Get('sessions/:token')
  @ApiOperation({ summary: 'Get session by token' })
  async getSession(@Param('token') token: string) {
    return this.sessionsService.findByToken(token);
  }

  @Patch('sessions/:id/customer')
  @ApiOperation({ summary: 'Update session customer data' })
  async updateSessionCustomer(
    @Param('id') id: string,
    @Body() body: {
      customerData: Record<string, unknown>;
      billingAddress?: Record<string, unknown>;
      shippingAddress?: Record<string, unknown>;
    },
  ) {
    return this.sessionsService.updateCustomerData(
      id,
      body.customerData as any,
      body.billingAddress as any,
      body.shippingAddress as any,
    );
  }

  @Patch('sessions/:id/gateway')
  @ApiOperation({ summary: 'Select payment gateway for session' })
  async selectGateway(
    @Param('id') id: string,
    @Body() body: { gateway: PaymentGatewayType },
  ) {
    return this.sessionsService.selectGateway(id, body.gateway);
  }

  @Post('sessions/:id/promo-code')
  @ApiOperation({ summary: 'Apply promo code to session' })
  async applyPromoCode(
    @Param('id') id: string,
    @Body() body: { promoCode: string },
  ) {
    return this.sessionsService.applyPromoCode(id, body.promoCode);
  }

  @Post('sessions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel checkout session' })
  async cancelSession(@Param('id') id: string) {
    return this.sessionsService.cancel(id);
  }
}

// ═══════════════════════════════════════════════════════════════
// DOMAINS CONTROLLER (Custom domain management)
// ═══════════════════════════════════════════════════════════════

@ApiTags('Payment Page Domains')
@Controller('payment-pages/domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List custom domains' })
  async list(
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      return [];
    }
    return this.domainsService.findAll(effectiveCompanyId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get domain by ID' })
  async findById(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.domainsService.findById(id, effectiveCompanyId!);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add custom domain' })
  @ApiResponse({ status: 201, description: 'Domain added, pending verification' })
  async create(
    @Body() dto: CreateDomainDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.domainsService.create(effectiveCompanyId!, dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update domain settings' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDomainDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.domainsService.update(id, effectiveCompanyId!, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove custom domain' })
  async delete(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    await this.domainsService.delete(id, effectiveCompanyId!);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify domain DNS configuration' })
  @ApiResponse({ status: 200, description: 'Verification result with status and errors' })
  async verifyDomain(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.domainsService.verifyDomain(id, effectiveCompanyId!);
  }

  @Post(':id/regenerate-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate verification token' })
  async regenerateToken(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.domainsService.regenerateVerificationToken(id, effectiveCompanyId!);
  }

  @Get(':id/ssl')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check SSL certificate status' })
  async checkSslStatus(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    return this.domainsService.checkSslStatus(id, effectiveCompanyId!);
  }
}

// ═══════════════════════════════════════════════════════════════
// INSIGHTS CONTROLLER (AI-powered analytics)
// ═══════════════════════════════════════════════════════════════

@ApiTags('Payment Page Insights')
@Controller('payment-pages/insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get company-wide insights summary' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'days', required: false, description: 'Analysis period in days (default: 30)' })
  async getCompanySummary(
    @Query('companyId') companyId: string,
    @Query('days') days?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user?.companyId;
    if (!effectiveCompanyId) {
      return {
        totalPages: 0,
        averageScore: 0,
        topPerformer: null,
        needsAttention: [],
        totalRevenue: 0,
        totalConversions: 0,
        overallConversionRate: 0,
      };
    }
    const periodDays = days ? parseInt(days, 10) : 30;
    return this.insightsService.getCompanyInsights(effectiveCompanyId, periodDays);
  }

  @Get(':pageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get insights for a specific payment page' })
  @ApiQuery({ name: 'days', required: false, description: 'Analysis period in days (default: 30)' })
  async getPageInsights(
    @Param('pageId') pageId: string,
    @Query('days') days?: string,
  ) {
    const periodDays = days ? parseInt(days, 10) : 30;
    return this.insightsService.generateInsights(pageId, periodDays);
  }
}

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE CONTROLLER (PCI DSS 4.0)
// ═══════════════════════════════════════════════════════════════

@ApiTags('Payment Page Compliance')
@Controller('payment-pages/compliance')
export class ComplianceController {
  constructor(private readonly complianceService: PciComplianceService) {}

  @Get('headers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recommended security headers' })
  @ApiQuery({ name: 'gateways', required: false, description: 'Comma-separated list of gateways' })
  async getSecurityHeaders(@Query('gateways') gateways?: string) {
    const gatewayList = gateways ? gateways.split(',') : [];
    const customDirectives = gatewayList.length > 0
      ? this.complianceService.buildGatewayCSP(gatewayList)
      : undefined;
    return this.complianceService.generateSecurityHeaders(customDirectives);
  }

  @Get('csp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Content Security Policy for gateways' })
  @ApiQuery({ name: 'gateways', required: true, description: 'Comma-separated list of gateways' })
  @ApiQuery({ name: 'nonce', required: false, description: 'Use nonce-based CSP (more secure)' })
  async getCSP(
    @Query('gateways') gateways: string,
    @Query('nonce') useNonce?: string,
  ) {
    const gatewayList = gateways.split(',');

    if (useNonce === 'true') {
      const nonce = this.complianceService.generateNonce();
      const csp = this.complianceService.buildCSPWithNonce(nonce, gatewayList);
      return { csp, nonce };
    }

    const directives = this.complianceService.buildGatewayCSP(gatewayList);
    const csp = this.complianceService.buildCSP(directives);
    return { csp, directives };
  }

  @Get('scripts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get approved scripts inventory (PCI DSS 6.4.3)' })
  @ApiQuery({ name: 'gateway', required: false, description: 'Filter by gateway' })
  async getApprovedScripts(@Query('gateway') gateway?: string) {
    if (gateway) {
      return {
        gateway,
        scripts: this.complianceService.getApprovedScripts(gateway),
      };
    }
    return {
      allScripts: this.complianceService.getAllApprovedScripts(),
    };
  }

  @Post('sri-hash')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate SRI hash for script content' })
  async generateSRIHash(@Body() body: { content: string }) {
    const hash = this.complianceService.generateSRIHash(body.content);
    return { hash, algorithm: 'sha384' };
  }

  @Get('audit/:pageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Audit payment page for PCI DSS compliance' })
  async auditPage(@Param('pageId') pageId: string) {
    return this.complianceService.auditPageCompliance(pageId);
  }

  @Get('report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get company-wide compliance report' })
  async getCompanyReport(
    @Query('companyId') companyId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user?.companyId;
    if (!effectiveCompanyId) {
      return {
        totalPages: 0,
        compliantPages: 0,
        criticalIssues: 0,
        highIssues: 0,
        pages: [],
      };
    }
    return this.complianceService.getCompanyComplianceReport(effectiveCompanyId);
  }
}
