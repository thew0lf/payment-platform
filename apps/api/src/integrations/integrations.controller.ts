import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IntegrationDefinitionService } from './services/integration-definition.service';
import { PlatformIntegrationService } from './services/platform-integration.service';
import { ClientIntegrationService } from './services/client-integration.service';
import {
  IntegrationDefinition, PlatformIntegration, ClientIntegration,
  CreatePlatformIntegrationDto, UpdatePlatformIntegrationDto,
  CreateClientIntegrationDto, UpdateClientIntegrationDto,
  ConfigureClientSharingDto, IntegrationTestResult, IntegrationCategory,
} from './types/integration.types';

@ApiTags('Platform Integrations')
@ApiBearerAuth()
@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORG_ADMIN')
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

  @Get('platform')
  @ApiOperation({ summary: 'List platform integrations' })
  async listPlatform(@CurrentUser() user: { organizationId: string }): Promise<PlatformIntegration[]> {
    return this.platformService.list(user.organizationId);
  }

  @Post('platform')
  @ApiOperation({ summary: 'Create platform integration' })
  async createPlatform(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: CreatePlatformIntegrationDto): Promise<PlatformIntegration> {
    return this.platformService.create(user.organizationId, dto, user.id);
  }

  @Patch('platform/:id')
  @ApiOperation({ summary: 'Update platform integration' })
  async updatePlatform(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: UpdatePlatformIntegrationDto): Promise<PlatformIntegration> {
    return this.platformService.update(id, dto, user.id);
  }

  @Delete('platform/:id')
  @ApiOperation({ summary: 'Delete platform integration' })
  async deletePlatform(@Param('id') id: string): Promise<void> {
    return this.platformService.delete(id);
  }

  @Post('platform/:id/test')
  @ApiOperation({ summary: 'Test platform integration' })
  async testPlatform(@Param('id') id: string): Promise<IntegrationTestResult> {
    return this.platformService.test(id);
  }

  @Patch('platform/:id/sharing')
  @ApiOperation({ summary: 'Configure client sharing' })
  async configureSharing(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: ConfigureClientSharingDto): Promise<PlatformIntegration> {
    return this.platformService.configureSharing(id, dto, user.id);
  }
}

@ApiTags('Client Integrations')
@ApiBearerAuth()
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT_ADMIN', 'CLIENT_USER')
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
  @Roles('CLIENT_ADMIN')
  async create(@CurrentUser() user: { id: string; clientId: string; organizationId: string }, @Body() dto: CreateClientIntegrationDto): Promise<ClientIntegration> {
    return this.clientService.create(user.clientId, user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client integration' })
  @Roles('CLIENT_ADMIN')
  async update(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: UpdateClientIntegrationDto): Promise<ClientIntegration> {
    return this.clientService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete client integration' })
  @Roles('CLIENT_ADMIN')
  async delete(@Param('id') id: string): Promise<void> {
    return this.clientService.delete(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test client integration' })
  async test(@Param('id') id: string): Promise<IntegrationTestResult> {
    return this.clientService.test(id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set as default' })
  @Roles('CLIENT_ADMIN')
  async setDefault(@Param('id') id: string, @CurrentUser() user: { id: string }): Promise<ClientIntegration> {
    return this.clientService.setDefault(id, user.id);
  }
}
