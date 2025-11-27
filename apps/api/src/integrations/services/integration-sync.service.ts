import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialEncryptionService } from './credential-encryption.service';
import { PlatformIntegrationService } from './platform-integration.service';
import { IntegrationCategory, IntegrationMode, IntegrationProvider } from '../types/integration.types';

@Injectable()
export class IntegrationSyncService {
  private readonly logger = new Logger(IntegrationSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: CredentialEncryptionService,
    private readonly platformService: PlatformIntegrationService,
  ) {}

  @OnEvent('integration.client.created')
  async handleIntegrationCreated(payload: { integrationId: string; clientId: string; provider: IntegrationProvider; mode: IntegrationMode; category: IntegrationCategory }): Promise<void> {
    if (payload.category !== IntegrationCategory.PAYMENT_GATEWAY) return;
    this.logger.log(`Creating MerchantAccount for integration ${payload.integrationId}`);
    try {
      const integration = await this.prisma.clientIntegration.findUnique({ where: { id: payload.integrationId } });
      if (!integration) return;

      const client = await this.prisma.client.findUnique({ where: { id: payload.clientId }, include: { companies: { where: { status: 'ACTIVE' }, take: 1 } } });
      if (!client || client.companies.length === 0) { this.logger.warn(`No active company for client ${payload.clientId}`); return; }
      const companyId = client.companies[0].id;

      let credentials: Record<string, any>;
      if (payload.mode === IntegrationMode.PLATFORM) {
        credentials = await this.platformService.getDecryptedCredentials(integration.platformIntegrationId!) as Record<string, any>;
      } else {
        credentials = this.encryptionService.decrypt(integration.credentials as any) as Record<string, any>;
      }

      const providerType = this.mapProviderToType(payload.provider);
      const encryptedCreds = this.encryptionService.encrypt(credentials);
      const merchantAccount = await this.prisma.merchantAccount.create({
        data: {
          companyId, name: integration.name, description: `Auto-created from integration: ${payload.mode}`,
          providerType, merchantId: (credentials.vendor || credentials.apiLoginId || 'auto') as string,
          credentials: JSON.parse(JSON.stringify(encryptedCreds)), environment: integration.environment.toLowerCase(),
          status: 'pending', minTransactionAmount: 50, maxTransactionAmount: 10000000,
        },
      });

      await this.prisma.clientIntegration.update({ where: { id: payload.integrationId }, data: { merchantAccountId: merchantAccount.id } });
      this.logger.log(`Created MerchantAccount ${merchantAccount.id}`);
    } catch (error) {
      this.logger.error(`Failed to create MerchantAccount`, error);
    }
  }

  @OnEvent('integration.client.updated')
  async handleIntegrationUpdated(payload: { integrationId: string; clientId: string; provider: IntegrationProvider }): Promise<void> {
    try {
      const integration = await this.prisma.clientIntegration.findUnique({ where: { id: payload.integrationId } });
      if (!integration || !integration.merchantAccountId) return;

      let credentials: Record<string, any>;
      if (integration.mode === IntegrationMode.PLATFORM) {
        credentials = await this.platformService.getDecryptedCredentials(integration.platformIntegrationId!) as Record<string, any>;
      } else {
        credentials = this.encryptionService.decrypt(integration.credentials as any) as Record<string, any>;
      }

      const encryptedCreds = this.encryptionService.encrypt(credentials);
      await this.prisma.merchantAccount.update({
        where: { id: integration.merchantAccountId },
        data: { name: integration.name, credentials: JSON.parse(JSON.stringify(encryptedCreds)), environment: integration.environment.toLowerCase() },
      });
      this.logger.log(`Updated MerchantAccount ${integration.merchantAccountId}`);
    } catch (error) {
      this.logger.error(`Failed to update MerchantAccount`, error);
    }
  }

  @OnEvent('integration.client.deleted')
  async handleIntegrationDeleted(payload: { integrationId: string; merchantAccountId?: string }): Promise<void> {
    if (!payload.merchantAccountId) return;
    try {
      await this.prisma.merchantAccount.update({ where: { id: payload.merchantAccountId }, data: { status: 'inactive' } });
    } catch (error) {
      this.logger.error(`Failed to deactivate MerchantAccount`, error);
    }
  }

  private mapProviderToType(provider: IntegrationProvider): string {
    const mapping: Record<string, string> = {
      [IntegrationProvider.PAYPAL_PAYFLOW]: 'PAYFLOW',
      [IntegrationProvider.NMI]: 'NMI',
      [IntegrationProvider.AUTHORIZE_NET]: 'AUTHORIZE_NET',
      [IntegrationProvider.STRIPE]: 'STRIPE',
    };
    return mapping[provider] || provider;
  }
}
