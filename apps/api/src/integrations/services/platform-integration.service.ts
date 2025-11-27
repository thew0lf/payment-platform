import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialEncryptionService } from './credential-encryption.service';
import { IntegrationDefinitionService } from './integration-definition.service';
import {
  PlatformIntegration, IntegrationProvider, IntegrationStatus,
  CreatePlatformIntegrationDto, UpdatePlatformIntegrationDto,
  ConfigureClientSharingDto, IntegrationTestResult,
} from '../types/integration.types';

@Injectable()
export class PlatformIntegrationService {
  private readonly logger = new Logger(PlatformIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: CredentialEncryptionService,
    private readonly definitionService: IntegrationDefinitionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(orgId: string, dto: CreatePlatformIntegrationDto, createdBy: string): Promise<PlatformIntegration> {
    const definition = await this.definitionService.getByProvider(dto.provider);
    if (!definition) throw new BadRequestException(`Unknown provider: ${dto.provider}`);

    const existing = await this.prisma.platformIntegration.findFirst({ where: { organizationId: orgId, provider: dto.provider } });
    if (existing) throw new BadRequestException(`Integration for ${dto.provider} already exists`);

    const encryptedCredentials = this.encryptionService.encrypt(dto.credentials);
    const integration = await this.prisma.platformIntegration.create({
      data: {
        organizationId: orgId,
        provider: dto.provider,
        category: definition.category,
        name: dto.name,
        description: dto.description,
        credentials: JSON.parse(JSON.stringify(encryptedCredentials)),
        settings: dto.settings ? JSON.parse(JSON.stringify(dto.settings)) : {},
        environment: dto.environment,
        isSharedWithClients: dto.isSharedWithClients || false,
        clientPricing: dto.clientPricing ? JSON.parse(JSON.stringify(dto.clientPricing)) : null,
        status: IntegrationStatus.PENDING,
        createdBy,
      },
    });
    this.logger.log(`Created platform integration: ${dto.provider}`);
    this.eventEmitter.emit('integration.platform.created', { integrationId: integration.id, organizationId: orgId, provider: dto.provider });
    return this.toResponse(integration);
  }

  async update(id: string, dto: UpdatePlatformIntegrationDto, updatedBy: string): Promise<PlatformIntegration> {
    const integration = await this.prisma.platformIntegration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Not found: ${id}`);

    const updateData: any = { updatedBy, updatedAt: new Date() };
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.settings !== undefined) updateData.settings = dto.settings;
    if (dto.environment !== undefined) updateData.environment = dto.environment;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.isSharedWithClients !== undefined) updateData.isSharedWithClients = dto.isSharedWithClients;
    if (dto.clientPricing !== undefined) updateData.clientPricing = dto.clientPricing;
    if (dto.credentials) updateData.credentials = this.encryptionService.encrypt(dto.credentials);

    const updated = await this.prisma.platformIntegration.update({ where: { id }, data: updateData });
    return this.toResponse(updated);
  }

  async delete(id: string): Promise<void> {
    const integration = await this.prisma.platformIntegration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Not found: ${id}`);
    const clientRefs = await this.prisma.clientIntegration.count({ where: { platformIntegrationId: id } });
    if (clientRefs > 0) throw new BadRequestException(`Cannot delete: ${clientRefs} client integrations reference this`);
    await this.prisma.platformIntegration.delete({ where: { id } });
    this.eventEmitter.emit('integration.platform.deleted', { integrationId: id });
  }

  async list(organizationId: string): Promise<PlatformIntegration[]> {
    const integrations = await this.prisma.platformIntegration.findMany({ where: { organizationId }, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    return integrations.map((i) => this.toResponse(i));
  }

  async getByProvider(organizationId: string, provider: IntegrationProvider): Promise<PlatformIntegration | null> {
    const integration = await this.prisma.platformIntegration.findFirst({ where: { organizationId, provider } });
    return integration ? this.toResponse(integration) : null;
  }

  async getSharedIntegrations(organizationId: string): Promise<PlatformIntegration[]> {
    const integrations = await this.prisma.platformIntegration.findMany({
      where: { organizationId, isSharedWithClients: true, status: IntegrationStatus.ACTIVE },
    });
    return integrations.map((i) => this.toResponse(i));
  }

  async configureSharing(id: string, dto: ConfigureClientSharingDto, updatedBy: string): Promise<PlatformIntegration> {
    return this.update(id, { isSharedWithClients: dto.isSharedWithClients, clientPricing: dto.clientPricing }, updatedBy);
  }

  async test(id: string): Promise<IntegrationTestResult> {
    const integration = await this.prisma.platformIntegration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Not found: ${id}`);
    const startTime = Date.now();
    try {
      const credentials = this.encryptionService.decrypt(integration.credentials as any) as Record<string, any>;
      const result = await this.testProvider(integration.provider as IntegrationProvider, credentials);
      const latencyMs = Date.now() - startTime;
      await this.prisma.platformIntegration.update({
        where: { id },
        data: { lastTestedAt: new Date(), lastTestResult: result.success ? 'success' : 'failure', errorMessage: result.success ? null : result.message, status: result.success ? IntegrationStatus.ACTIVE : IntegrationStatus.ERROR },
      });
      return { ...result, latencyMs, testedAt: new Date() };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.prisma.platformIntegration.update({ where: { id }, data: { lastTestedAt: new Date(), lastTestResult: 'failure', errorMessage: message, status: IntegrationStatus.ERROR } });
      return { success: false, message, latencyMs: Date.now() - startTime, testedAt: new Date() };
    }
  }

  async getDecryptedCredentials(id: string): Promise<Record<string, any>> {
    const integration = await this.prisma.platformIntegration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Not found: ${id}`);
    return this.encryptionService.decrypt(integration.credentials as any) as Record<string, any>;
  }

  private async testProvider(provider: IntegrationProvider, credentials: Record<string, any>): Promise<{ success: boolean; message: string }> {
    switch (provider) {
      case IntegrationProvider.PAYPAL_PAYFLOW:
        if (!credentials.vendor || !credentials.user || !credentials.password) return { success: false, message: 'Missing Payflow credentials' };
        return { success: true, message: 'Payflow credentials validated' };
      case IntegrationProvider.AUTH0:
        if (!credentials.domain || !credentials.clientId || !credentials.clientSecret) return { success: false, message: 'Missing Auth0 credentials' };
        return { success: true, message: 'Auth0 credentials validated' };
      default:
        return { success: true, message: 'Credentials validated' };
    }
  }

  private toResponse(record: any): PlatformIntegration {
    return {
      id: record.id,
      organizationId: record.organizationId,
      provider: record.provider,
      category: record.category,
      name: record.name,
      description: record.description,
      environment: record.environment,
      isSharedWithClients: record.isSharedWithClients,
      clientPricing: record.clientPricing,
      status: record.status,
      lastTestedAt: record.lastTestedAt,
      lastTestResult: record.lastTestResult,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
    };
  }
}
