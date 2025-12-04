import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Res, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopeGuard, Scopes } from '../auth/guards/scope.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IntegrationDefinitionService } from './services/integration-definition.service';
import { PlatformIntegrationService } from './services/platform-integration.service';
import { ClientIntegrationService } from './services/client-integration.service';
import { OAuthService } from './services/oauth.service';
import {
  IntegrationDefinition, PlatformIntegration, ClientIntegration,
  CreatePlatformIntegrationDto, UpdatePlatformIntegrationDto,
  CreateClientIntegrationDto, UpdateClientIntegrationDto,
  ConfigureClientSharingDto, IntegrationTestResult, IntegrationCategory,
} from './types/integration.types';
import { OAuthFlowType } from '@prisma/client';

@ApiTags('Platform Integrations')
@ApiBearerAuth()
@Controller('integrations/platform')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Scopes('ORGANIZATION')
export class PlatformIntegrationsController {
  constructor(
    private readonly definitionService: IntegrationDefinitionService,
    private readonly platformService: PlatformIntegrationService,
  ) {}

  @Get('definitions')
  @ApiOperation({ summary: 'Get all integration definitions' })
  async getDefinitions(): Promise<IntegrationDefinition[]> {
    return this.definitionService.getAll();
  }

  @Get('definitions/category/:category')
  @ApiOperation({ summary: 'Get definitions by category' })
  async getDefinitionsByCategory(@Param('category') category: IntegrationCategory): Promise<IntegrationDefinition[]> {
    return this.definitionService.getByCategory(category);
  }

  @Get()
  @ApiOperation({ summary: 'List platform integrations' })
  async listPlatform(@CurrentUser() user: { organizationId: string }): Promise<PlatformIntegration[]> {
    return this.platformService.list(user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create platform integration' })
  async createPlatform(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: CreatePlatformIntegrationDto): Promise<PlatformIntegration> {
    return this.platformService.create(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update platform integration' })
  async updatePlatform(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: UpdatePlatformIntegrationDto): Promise<PlatformIntegration> {
    return this.platformService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete platform integration' })
  async deletePlatform(@Param('id') id: string): Promise<void> {
    return this.platformService.delete(id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test platform integration' })
  async testPlatform(@Param('id') id: string): Promise<IntegrationTestResult> {
    return this.platformService.test(id);
  }

  @Patch(':id/sharing')
  @ApiOperation({ summary: 'Configure client sharing' })
  async configureSharing(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: ConfigureClientSharingDto): Promise<PlatformIntegration> {
    return this.platformService.configureSharing(id, dto, user.id);
  }
}

@ApiTags('Client Integrations')
@ApiBearerAuth()
@Controller('integrations/client')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER')
@Scopes('CLIENT')
export class ClientIntegrationsController {
  constructor(private readonly clientService: ClientIntegrationService) {}

  @Get('available')
  @ApiOperation({ summary: 'Get available integrations' })
  async getAvailable(@CurrentUser() user: { clientId: string; organizationId: string }) {
    return this.clientService.getAvailable(user.clientId, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List client integrations' })
  async list(@CurrentUser() user: { clientId: string }): Promise<ClientIntegration[]> {
    return this.clientService.list(user.clientId);
  }

  @Post()
  @ApiOperation({ summary: 'Create client integration' })
  @Roles('SUPER_ADMIN', 'ADMIN')
  async create(@CurrentUser() user: { id: string; clientId: string; organizationId: string }, @Body() dto: CreateClientIntegrationDto): Promise<ClientIntegration> {
    return this.clientService.create(user.clientId, user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client integration' })
  @Roles('SUPER_ADMIN', 'ADMIN')
  async update(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: UpdateClientIntegrationDto): Promise<ClientIntegration> {
    return this.clientService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete client integration' })
  @Roles('SUPER_ADMIN', 'ADMIN')
  async delete(@Param('id') id: string): Promise<void> {
    return this.clientService.delete(id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test client integration' })
  async test(@Param('id') id: string): Promise<IntegrationTestResult> {
    return this.clientService.test(id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set as default' })
  @Roles('SUPER_ADMIN', 'ADMIN')
  async setDefault(@Param('id') id: string, @CurrentUser() user: { id: string }): Promise<ClientIntegration> {
    return this.clientService.setDefault(id, user.id);
  }
}

// DTO for OAuth authorization request
class StartOAuthDto {
  provider: string;
  flowType: 'PLATFORM' | 'CLIENT';
  clientId?: string;
  redirectUrl?: string;
  additionalScopes?: string[];
  shopDomain?: string; // For Shopify
}

@ApiTags('OAuth Integrations')
@Controller('integrations/oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Get available OAuth providers' })
  getProviders(): string[] {
    return this.oauthService.getAvailableProviders();
  }

  @Get('provider/:provider/config')
  @ApiOperation({ summary: 'Get OAuth provider configuration' })
  getProviderConfig(@Param('provider') provider: string) {
    const config = this.oauthService.getProviderConfig(provider);
    if (!config) {
      throw new BadRequestException(`Unknown OAuth provider: ${provider}`);
    }
    // Don't expose sensitive URLs, just return scopes
    return {
      provider: provider.toUpperCase(),
      scopes: config.scopes,
      pkceRequired: config.pkceRequired,
    };
  }

  @Post('authorize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start OAuth authorization flow' })
  async startAuthorization(
    @CurrentUser() user: { id: string; organizationId: string; clientId?: string },
    @Body() dto: StartOAuthDto,
  ) {
    // Validate flow type matches user context
    if (dto.flowType === 'PLATFORM' && !user.organizationId) {
      throw new BadRequestException('Platform flow requires organization context');
    }
    if (dto.flowType === 'CLIENT' && !dto.clientId && !user.clientId) {
      throw new BadRequestException('Client flow requires client ID');
    }

    const result = await this.oauthService.generateAuthorizationUrl({
      provider: dto.provider,
      organizationId: dto.flowType === 'PLATFORM' ? user.organizationId : undefined,
      clientId: dto.flowType === 'CLIENT' ? (dto.clientId || user.clientId) : undefined,
      userId: user.id,
      flowType: dto.flowType === 'PLATFORM' ? OAuthFlowType.PLATFORM : OAuthFlowType.CLIENT,
      redirectUrl: dto.redirectUrl,
      additionalScopes: dto.additionalScopes,
      shopDomain: dto.shopDomain,
    });

    return result;
  }

  @Get('callback')
  @ApiOperation({ summary: 'OAuth callback endpoint' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const result = await this.oauthService.handleCallback({
      code,
      state,
      error,
      errorDescription,
    });

    // Determine redirect URL based on result
    const baseUrl = process.env.ADMIN_DASHBOARD_URL || 'http://admin.dev.avnz.io:3002';

    if (result.success) {
      const redirectUrl = result.redirectUrl || `${baseUrl}/integrations`;
      const params = new URLSearchParams({
        success: 'true',
        integrationId: result.integrationId || '',
        flowType: result.flowType || '',
      });
      return res.redirect(`${redirectUrl}?${params.toString()}`);
    } else {
      const redirectUrl = `${baseUrl}/integrations`;
      const params = new URLSearchParams({
        success: 'false',
        error: result.error || 'Unknown error',
      });
      return res.redirect(`${redirectUrl}?${params.toString()}`);
    }
  }

  @Post('revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke OAuth tokens' })
  async revokeTokens(
    @Body() dto: { platformIntegrationId?: string; clientIntegrationId?: string },
  ) {
    await this.oauthService.revokeToken(dto);
    return { success: true };
  }
}
