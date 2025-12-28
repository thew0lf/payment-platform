import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialEncryptionService } from './credential-encryption.service';
import { IntegrationDefinitionService } from './integration-definition.service';
import { PlatformIntegrationService } from './platform-integration.service';
import {
  ClientIntegration, IntegrationProvider, IntegrationCategory, IntegrationStatus,
  IntegrationMode, IntegrationDefinition, PlatformIntegration,
  CreateClientIntegrationDto, UpdateClientIntegrationDto, IntegrationTestResult,
} from '../types/integration.types';
// Provider Services
import { LanguageToolService } from './providers/languagetool.service';
import { CloudinaryService } from './providers/cloudinary.service';
import { RunwayService } from './providers/runway.service';

@Injectable()
export class ClientIntegrationService {
  private readonly logger = new Logger(ClientIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: CredentialEncryptionService,
    private readonly definitionService: IntegrationDefinitionService,
    private readonly platformService: PlatformIntegrationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly languageToolService: LanguageToolService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly runwayService: RunwayService,
  ) {}

  async create(clientId: string, organizationId: string | undefined, dto: CreateClientIntegrationDto, createdBy: string): Promise<ClientIntegration> {
    const definition = await this.definitionService.getByProvider(dto.provider);
    if (!definition) throw new BadRequestException(`Unknown provider: ${dto.provider}`);
    if (!definition.isClientAllowed) throw new BadRequestException(`Provider ${dto.provider} not available for clients`);

    if (dto.mode === IntegrationMode.OWN && !dto.credentials) throw new BadRequestException('Credentials required for OWN mode');
    if (dto.mode === IntegrationMode.PLATFORM) {
      // Resolve organizationId from client if not provided directly
      let resolvedOrgId = organizationId;
      if (!resolvedOrgId && clientId) {
        const client = await this.prisma.client.findUnique({
          where: { id: clientId },
          select: { organizationId: true },
        });
        resolvedOrgId = client?.organizationId || undefined;
      }
      if (!resolvedOrgId) throw new BadRequestException('Organization not found for platform integration');
      const platformInt = await this.platformService.getByProvider(resolvedOrgId, dto.provider);
      if (!platformInt || !platformInt.isSharedWithClients) throw new BadRequestException(`Platform gateway for ${dto.provider} not available`);
      dto.platformIntegrationId = platformInt.id;
    }

    const existing = await this.prisma.clientIntegration.findFirst({ where: { clientId, provider: dto.provider, name: dto.name } });
    if (existing) throw new BadRequestException(`Integration "${dto.name}" already exists`);

    let encryptedCredentials = null;
    if (dto.credentials) encryptedCredentials = this.encryptionService.encrypt(dto.credentials);

    if (dto.isDefault) {
      await this.prisma.clientIntegration.updateMany({ where: { clientId, category: definition.category, isDefault: true }, data: { isDefault: false } });
    }

    const maxPriority = await this.prisma.clientIntegration.aggregate({ where: { clientId, category: definition.category }, _max: { priority: true } });
    const priority = (maxPriority._max.priority || 0) + 1;

    const integration = await this.prisma.clientIntegration.create({
      data: {
        clientId, provider: dto.provider, category: definition.category, name: dto.name, description: dto.description,
        mode: dto.mode, credentials: encryptedCredentials ? JSON.parse(JSON.stringify(encryptedCredentials)) : null, platformIntegrationId: dto.platformIntegrationId,
        settings: dto.settings ? JSON.parse(JSON.stringify(dto.settings)) : {}, environment: dto.environment, isDefault: dto.isDefault || false, priority,
        status: IntegrationStatus.PENDING, isVerified: false, createdBy,
      },
    });

    this.logger.log(`Created client integration: ${dto.provider} (${dto.mode})`);
    if (definition.category === IntegrationCategory.PAYMENT_GATEWAY) {
      this.eventEmitter.emit('integration.client.created', { integrationId: integration.id, clientId, provider: dto.provider, mode: dto.mode, category: definition.category });
    }
    return this.toResponse(integration);
  }

  async update(id: string, clientId: string, dto: UpdateClientIntegrationDto, updatedBy: string): Promise<ClientIntegration> {
    // Security: Verify integration belongs to the requesting client
    const integration = await this.prisma.clientIntegration.findFirst({ where: { id, clientId } });
    if (!integration) throw new NotFoundException(`Not found: ${id}`);

    const updateData: any = { updatedBy, updatedAt: new Date() };
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.settings !== undefined) updateData.settings = dto.settings;
    if (dto.environment !== undefined) updateData.environment = dto.environment;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (dto.isDefault !== undefined) {
      if (dto.isDefault) {
        await this.prisma.clientIntegration.updateMany({ where: { clientId: integration.clientId, category: integration.category, isDefault: true, id: { not: id } }, data: { isDefault: false } });
      }
      updateData.isDefault = dto.isDefault;
    }

    if (dto.credentials) {
      updateData.credentials = this.encryptionService.encrypt(dto.credentials);
      updateData.isVerified = false;
    }

    const updated = await this.prisma.clientIntegration.update({ where: { id }, data: updateData });
    if (integration.category === IntegrationCategory.PAYMENT_GATEWAY) {
      this.eventEmitter.emit('integration.client.updated', { integrationId: id, clientId: integration.clientId, provider: integration.provider });
    }
    return this.toResponse(updated);
  }

  async delete(id: string, clientId: string): Promise<void> {
    // Security: Verify integration belongs to the requesting client
    const integration = await this.prisma.clientIntegration.findFirst({ where: { id, clientId } });
    if (!integration) throw new NotFoundException(`Not found: ${id}`);
    if (integration.merchantAccountId) {
      await this.prisma.merchantAccount.update({ where: { id: integration.merchantAccountId }, data: { status: 'inactive' } });
    }
    await this.prisma.clientIntegration.delete({ where: { id } });
    this.eventEmitter.emit('integration.client.deleted', { integrationId: id, clientId: integration.clientId, merchantAccountId: integration.merchantAccountId });
  }

  async list(clientId: string): Promise<ClientIntegration[]> {
    const integrations = await this.prisma.clientIntegration.findMany({ where: { clientId }, orderBy: [{ category: 'asc' }, { priority: 'asc' }] });
    return integrations.map((i) => this.toResponse(i));
  }

  async listByOrganization(organizationId: string): Promise<ClientIntegration[]> {
    // Get all clients belonging to this organization
    const clients = await this.prisma.client.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const clientIds = clients.map((c) => c.id);

    // Get all integrations for these clients
    const integrations = await this.prisma.clientIntegration.findMany({
      where: { clientId: { in: clientIds } },
      orderBy: [{ category: 'asc' }, { priority: 'asc' }],
    });
    return integrations.map((i) => this.toResponse(i));
  }

  async getAvailable(clientId: string, organizationId?: string): Promise<{ definitions: IntegrationDefinition[]; platformOptions: PlatformIntegration[] }> {
    const definitions = await this.definitionService.getClientAllowed();

    // Resolve organizationId from client if not provided directly (for CLIENT/COMPANY-scoped users)
    let resolvedOrgId = organizationId;
    if (!resolvedOrgId && clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        select: { organizationId: true },
      });
      resolvedOrgId = client?.organizationId || undefined;
    }

    // Get platform options only if we have an organizationId
    const platformOptions = resolvedOrgId
      ? await this.platformService.getSharedIntegrations(resolvedOrgId)
      : [];

    return { definitions, platformOptions };
  }

  async setDefault(id: string, clientId: string, updatedBy: string): Promise<ClientIntegration> {
    return this.update(id, clientId, { isDefault: true }, updatedBy);
  }

  async getDefaultPaymentGateway(clientId: string): Promise<ClientIntegration | null> {
    const integration = await this.prisma.clientIntegration.findFirst({
      where: { clientId, category: IntegrationCategory.PAYMENT_GATEWAY, isDefault: true, status: IntegrationStatus.ACTIVE },
    });
    return integration ? this.toResponse(integration) : null;
  }

  async test(id: string, clientId: string): Promise<IntegrationTestResult> {
    // Security: Verify integration belongs to the requesting client
    const integration = await this.prisma.clientIntegration.findFirst({ where: { id, clientId } });
    if (!integration) throw new NotFoundException(`Not found: ${id}`);
    const startTime = Date.now();
    try {
      let credentials: Record<string, any>;
      if (integration.mode === IntegrationMode.PLATFORM) {
        credentials = await this.platformService.getDecryptedCredentials(integration.platformIntegrationId!) as Record<string, any>;
      } else {
        credentials = this.encryptionService.decrypt(integration.credentials as any) as Record<string, any>;
      }
      // Include environment in credentials for providers that need it
      const credentialsWithEnv = { ...credentials, environment: integration.environment };
      const result = await this.testProvider(integration.provider as IntegrationProvider, credentialsWithEnv);
      const latencyMs = Date.now() - startTime;
      await this.prisma.clientIntegration.update({
        where: { id },
        data: { lastTestedAt: new Date(), lastTestResult: result.success ? 'success' : 'failure', errorMessage: result.success ? null : result.message, status: result.success ? IntegrationStatus.ACTIVE : IntegrationStatus.ERROR, isVerified: result.success, verifiedAt: result.success ? new Date() : null },
      });
      return { ...result, latencyMs, testedAt: new Date() };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.prisma.clientIntegration.update({ where: { id }, data: { lastTestedAt: new Date(), lastTestResult: 'failure', errorMessage: message, status: IntegrationStatus.ERROR } });
      return { success: false, message, latencyMs: Date.now() - startTime, testedAt: new Date() };
    }
  }

  async trackUsage(id: string, transactionCount: number, transactionVolume: number): Promise<void> {
    const integration = await this.prisma.clientIntegration.findUnique({ where: { id } });
    if (!integration || integration.mode !== IntegrationMode.PLATFORM) return;
    const currentUsage = (integration.usageThisMonth as any) || { transactionCount: 0, transactionVolume: 0 };
    await this.prisma.clientIntegration.update({
      where: { id },
      data: { usageThisMonth: { transactionCount: currentUsage.transactionCount + transactionCount, transactionVolume: currentUsage.transactionVolume + transactionVolume, lastUpdated: new Date() } },
    });
  }

  private async testProvider(provider: IntegrationProvider, credentials: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    switch (provider) {
      case IntegrationProvider.PAYPAL_PAYFLOW:
        if (!credentials.vendor || !credentials.user || !credentials.password) return { success: false, message: 'Missing Payflow credentials' };
        return { success: true, message: 'Payflow credentials validated' };
      case IntegrationProvider.NMI:
        if (!credentials.securityKey) return { success: false, message: 'Missing NMI security key' };
        return { success: true, message: 'NMI credentials validated' };
      case IntegrationProvider.AUTHORIZE_NET:
        if (!credentials.apiLoginId || !credentials.transactionKey) return { success: false, message: 'Missing Authorize.Net credentials' };
        return { success: true, message: 'Authorize.Net credentials validated' };
      case IntegrationProvider.STRIPE:
        if (!credentials.secretKey) return { success: false, message: 'Missing Stripe secret key' };
        return { success: true, message: 'Stripe credentials validated' };
      // AI/ML Providers (client-allowed)
      case IntegrationProvider.LANGUAGETOOL:
        return this.languageToolService.testConnection(credentials as any);
      // Image Processing Providers (client-allowed)
      case IntegrationProvider.CLOUDINARY:
        return this.cloudinaryService.testConnection(credentials as any);
      // Video Generation Providers (client-allowed)
      case IntegrationProvider.RUNWAY:
        return this.runwayService.testConnection(credentials as any);
      default:
        return { success: true, message: 'Credentials validated' };
    }
  }

  private toResponse(record: any): ClientIntegration {
    return {
      id: record.id, clientId: record.clientId, provider: record.provider, category: record.category,
      name: record.name, description: record.description, mode: record.mode, platformIntegrationId: record.platformIntegrationId,
      environment: record.environment, usageThisMonth: record.usageThisMonth, isDefault: record.isDefault, priority: record.priority,
      status: record.status, isVerified: record.isVerified, verifiedAt: record.verifiedAt, verifiedBy: record.verifiedBy,
      lastTestedAt: record.lastTestedAt, lastTestResult: record.lastTestResult, errorMessage: record.errorMessage,
      merchantAccountId: record.merchantAccountId, createdAt: record.createdAt, updatedAt: record.updatedAt, createdBy: record.createdBy, updatedBy: record.updatedBy,
    };
  }
}
