import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationCategory, IntegrationDefinition, IntegrationProvider } from '../types/integration.types';
import { CREDENTIAL_SCHEMAS } from '../types/credential-schemas';

@Injectable()
export class IntegrationDefinitionService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationDefinitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefinitions();
  }

  async seedDefinitions(): Promise<void> {
    const existingCount = await this.prisma.integrationDefinition.count();
    if (existingCount > 0) {
      this.logger.log(`${existingCount} definitions already seeded`);
      return;
    }
    this.logger.log('Seeding integration definitions...');
    const definitions = this.getDefaultDefinitions();
    for (const def of definitions) {
      await this.prisma.integrationDefinition.create({ data: def as any });
    }
    this.logger.log(`Seeded ${definitions.length} definitions`);
  }

  async getAll(): Promise<IntegrationDefinition[]> {
    return this.prisma.integrationDefinition.findMany({
      where: { status: 'active' },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    }) as unknown as IntegrationDefinition[];
  }

  async getByCategory(category: IntegrationCategory): Promise<IntegrationDefinition[]> {
    return this.prisma.integrationDefinition.findMany({
      where: { category, status: 'active' },
    }) as unknown as IntegrationDefinition[];
  }

  async getClientAllowed(): Promise<IntegrationDefinition[]> {
    return this.prisma.integrationDefinition.findMany({
      where: { isClientAllowed: true, status: 'active' },
    }) as unknown as IntegrationDefinition[];
  }

  async getByProvider(provider: IntegrationProvider): Promise<IntegrationDefinition | null> {
    return this.prisma.integrationDefinition.findUnique({
      where: { provider },
    }) as unknown as IntegrationDefinition | null;
  }

  private getDefaultDefinitions(): Partial<IntegrationDefinition>[] {
    return [
      {
        provider: IntegrationProvider.PAYPAL_PAYFLOW,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        name: 'PayPal Payflow Pro',
        description: 'PayPal Payflow Pro payment gateway',
        logoUrl: '/integrations/paypal.svg',
        documentationUrl: 'https://developer.paypal.com/docs/payflow/',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: true,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.PAYPAL_PAYFLOW]!,
        requiredCompliance: ['pci_dss'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.NMI,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        name: 'NMI',
        description: 'NMI payment gateway',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: false,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.NMI]!,
        requiredCompliance: ['pci_dss'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.AUTHORIZE_NET,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        name: 'Authorize.Net',
        description: 'Authorize.Net payment gateway',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: false,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AUTHORIZE_NET]!,
        requiredCompliance: ['pci_dss'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.STRIPE,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        name: 'Stripe',
        description: 'Stripe payment platform',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: false,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.STRIPE]!,
        requiredCompliance: ['pci_dss', 'soc2'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.AUTH0,
        category: IntegrationCategory.AUTHENTICATION,
        name: 'Auth0',
        description: 'Auth0 identity platform',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AUTH0]!,
        requiredCompliance: ['soc2', 'iso27001'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.AWS_SES,
        category: IntegrationCategory.EMAIL_TRANSACTIONAL,
        name: 'AWS SES',
        description: 'Amazon Simple Email Service',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AWS_SES]!,
        requiredCompliance: ['soc2', 'iso27001', 'pci_dss'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.TWILIO,
        category: IntegrationCategory.SMS,
        name: 'Twilio',
        description: 'Twilio SMS and Voice',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.TWILIO]!,
        requiredCompliance: ['soc2', 'iso27001', 'pci_dss'],
        status: 'active',
      },
    ];
  }
}
