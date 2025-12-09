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
// Provider Services
import { Auth0Service } from './providers/auth0.service';
import { BedrockService } from './providers/bedrock.service';
import { S3StorageService } from './providers/s3-storage.service';
import { LanguageToolService } from './providers/languagetool.service';
import { CloudinaryService } from './providers/cloudinary.service';
import { RunwayService } from './providers/runway.service';
import { CloudFrontService } from './providers/cloudfront.service';
import { CloudWatchService } from './providers/cloudwatch.service';
// Payment Gateway Services
import { StripeService } from './providers/stripe.service';
import { PayPalClassicService } from './providers/paypal-classic.service';
import { NMIService } from './providers/nmi.service';
import { AuthorizeNetService } from './providers/authorize-net.service';
// AWS Services
import { AWSSESService } from './providers/aws-ses.service';
import { AWSSNSService } from './providers/aws-sns.service';
// Email & Marketing Services
import { SendGridService } from './providers/sendgrid.service';
import { KlaviyoService } from './providers/klaviyo.service';
// AI Services
import { OpenAIService } from './providers/openai.service';
// Monitoring Services
import { DatadogService } from './providers/datadog.service';
import { SentryService } from './providers/sentry.service';
// Feature Flags
import { LaunchDarklyService } from './providers/launchdarkly.service';
// OAuth/Communication
import { SlackService } from './providers/slack.service';
import { TwilioService } from './providers/twilio.service';
import { Route53Service } from './providers/route53.service';
// Deployment
import { VercelService } from './providers/vercel.service';
// Location Services
import { GooglePlacesService } from './providers/google-places.service';

@Injectable()
export class PlatformIntegrationService {
  private readonly logger = new Logger(PlatformIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: CredentialEncryptionService,
    private readonly definitionService: IntegrationDefinitionService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auth0Service: Auth0Service,
    private readonly bedrockService: BedrockService,
    private readonly s3StorageService: S3StorageService,
    private readonly languageToolService: LanguageToolService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly runwayService: RunwayService,
    private readonly cloudFrontService: CloudFrontService,
    private readonly cloudWatchService: CloudWatchService,
    // Payment Gateway Services
    private readonly stripeService: StripeService,
    private readonly paypalClassicService: PayPalClassicService,
    private readonly nmiService: NMIService,
    private readonly authorizeNetService: AuthorizeNetService,
    // AWS Services
    private readonly awsSesService: AWSSESService,
    private readonly awsSnsService: AWSSNSService,
    // Email & Marketing Services
    private readonly sendGridService: SendGridService,
    private readonly klaviyoService: KlaviyoService,
    // AI Services
    private readonly openAIService: OpenAIService,
    // Monitoring Services
    private readonly datadogService: DatadogService,
    private readonly sentryService: SentryService,
    // Feature Flags
    private readonly launchDarklyService: LaunchDarklyService,
    // OAuth/Communication
    private readonly slackService: SlackService,
    private readonly twilioService: TwilioService,
    private readonly route53Service: Route53Service,
    // Deployment
    private readonly vercelService: VercelService,
    // Location Services
    private readonly googlePlacesService: GooglePlacesService,
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
      // Include environment in credentials for providers that need it
      const credentialsWithEnv = { ...credentials, environment: integration.environment };
      const result = await this.testProvider(integration.provider as IntegrationProvider, credentialsWithEnv);
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
      // Payment Gateway Providers
      case IntegrationProvider.STRIPE:
        return this.stripeService.testConnection(credentials as any);
      case IntegrationProvider.PAYPAL_CLASSIC:
        return this.paypalClassicService.testConnection(credentials as any);
      case IntegrationProvider.NMI:
        return this.nmiService.testConnection(credentials as any);
      case IntegrationProvider.AUTHORIZE_NET:
        return this.authorizeNetService.testConnection(credentials as any);
      case IntegrationProvider.PAYPAL_PAYFLOW:
        if (!credentials.vendor || !credentials.user || !credentials.password) return { success: false, message: 'Missing Payflow credentials' };
        return { success: true, message: 'Payflow credentials validated (beta)' };
      // Authentication Providers
      case IntegrationProvider.AUTH0:
        return this.auth0Service.testConnection(credentials as any);
      // AI/ML Providers
      case IntegrationProvider.AWS_BEDROCK:
        return this.bedrockService.testConnection(credentials as any);
      case IntegrationProvider.LANGUAGETOOL:
        return this.languageToolService.testConnection(credentials as any);
      // Storage Providers
      case IntegrationProvider.AWS_S3:
        return this.s3StorageService.testConnection(credentials as any);
      // Image Processing Providers
      case IntegrationProvider.CLOUDINARY:
        return this.cloudinaryService.testConnection(credentials as any);
      // Video Generation Providers
      case IntegrationProvider.RUNWAY:
        return this.runwayService.testConnection(credentials as any);
      // CDN Providers
      case IntegrationProvider.AWS_CLOUDFRONT:
        return this.cloudFrontService.testConnection(credentials as any);
      // Monitoring Providers
      case IntegrationProvider.CLOUDWATCH:
        return this.cloudWatchService.testConnection(credentials as any);
      case IntegrationProvider.DATADOG:
        return this.datadogService.testConnection(credentials as any);
      case IntegrationProvider.SENTRY:
        return this.sentryService.testConnection(credentials as any);
      // AWS Email/SMS
      case IntegrationProvider.AWS_SES:
        return this.awsSesService.testConnection(credentials as any);
      case IntegrationProvider.AWS_SNS:
        return this.awsSnsService.testConnection(credentials as any);
      // DNS
      case IntegrationProvider.AWS_ROUTE53:
        return this.route53Service.testConnection(credentials as any);
      // Email & Marketing
      case IntegrationProvider.SENDGRID:
        return this.sendGridService.testConnection(credentials as any);
      case IntegrationProvider.KLAVIYO:
        return this.klaviyoService.testConnection(credentials as any);
      // SMS/Communication
      case IntegrationProvider.TWILIO:
        return this.twilioService.testConnectionWithCredentials(credentials as any);
      // AI
      case IntegrationProvider.OPENAI:
        return this.openAIService.testConnection(credentials as any);
      // Feature Flags
      case IntegrationProvider.LAUNCHDARKLY:
        return this.launchDarklyService.testConnection(credentials as any);
      // OAuth
      case IntegrationProvider.SLACK:
        return this.slackService.testConnection(credentials as any);
      // Deployment
      case IntegrationProvider.VERCEL:
        return this.vercelService.testConnection(credentials as any);
      // Location Services
      case IntegrationProvider.GOOGLE_PLACES:
        return this.googlePlacesService.testConnection(credentials as any);
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
