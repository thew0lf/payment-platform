import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthType, IntegrationCategory, IntegrationDefinition, IntegrationProvider } from '../types/integration.types';
import { CREDENTIAL_SCHEMAS } from '../types/credential-schemas';

@Injectable()
export class IntegrationDefinitionService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationDefinitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefinitions();
  }

  async seedDefinitions(): Promise<void> {
    this.logger.log('Syncing integration definitions...');
    const definitions = this.getDefaultDefinitions();
    let created = 0;
    let updated = 0;

    for (const def of definitions) {
      const existing = await this.prisma.integrationDefinition.findUnique({
        where: { provider: def.provider as string },
      });

      if (existing) {
        updated++;
      } else {
        await this.prisma.integrationDefinition.create({ data: def as any });
        created++;
      }
    }

    this.logger.log(`Integration definitions synced: ${created} created, ${updated} already exist`);
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
      // Payment Gateways
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
        authType: AuthType.API_KEY,
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
        authType: AuthType.API_KEY,
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
        authType: AuthType.API_KEY,
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
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.STRIPE]!,
        requiredCompliance: ['pci_dss', 'soc2'],
        status: 'active',
      },
      // Authentication
      {
        provider: IntegrationProvider.AUTH0,
        category: IntegrationCategory.AUTHENTICATION,
        name: 'Auth0',
        description: 'Auth0 identity platform',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AUTH0]!,
        requiredCompliance: ['soc2', 'iso27001'],
        status: 'active',
      },
      // Email
      {
        provider: IntegrationProvider.AWS_SES,
        category: IntegrationCategory.EMAIL_TRANSACTIONAL,
        name: 'AWS SES',
        description: 'Amazon Simple Email Service',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AWS_SES]!,
        requiredCompliance: ['soc2', 'iso27001', 'pci_dss'],
        status: 'active',
      },
      // SMS
      {
        provider: IntegrationProvider.TWILIO,
        category: IntegrationCategory.SMS,
        name: 'Twilio',
        description: 'Twilio SMS and Voice',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.TWILIO]!,
        requiredCompliance: ['soc2', 'iso27001', 'pci_dss'],
        status: 'active',
      },
      // OAuth Providers
      {
        provider: IntegrationProvider.GOOGLE,
        category: IntegrationCategory.OAUTH,
        name: 'Google',
        description: 'Connect to Google Workspace services (Calendar, Gmail, Drive)',
        logoUrl: '/integrations/google.svg',
        documentationUrl: 'https://developers.google.com/identity/protocols/oauth2',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.GOOGLE]!,
        requiredCompliance: ['soc2'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.MICROSOFT,
        category: IntegrationCategory.OAUTH,
        name: 'Microsoft',
        description: 'Connect to Microsoft 365 services (Outlook, Teams, OneDrive)',
        logoUrl: '/integrations/microsoft.svg',
        documentationUrl: 'https://docs.microsoft.com/en-us/azure/active-directory/develop/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.MICROSOFT]!,
        requiredCompliance: ['soc2'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.SLACK,
        category: IntegrationCategory.OAUTH,
        name: 'Slack',
        description: 'Connect to Slack for notifications and messaging',
        logoUrl: '/integrations/slack.svg',
        documentationUrl: 'https://api.slack.com/authentication/oauth-v2',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.SLACK]!,
        requiredCompliance: ['soc2'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.HUBSPOT,
        category: IntegrationCategory.OAUTH,
        name: 'HubSpot',
        description: 'Connect to HubSpot CRM for contacts and deals',
        logoUrl: '/integrations/hubspot.svg',
        documentationUrl: 'https://developers.hubspot.com/docs/api/oauth-quickstart-guide',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.HUBSPOT]!,
        requiredCompliance: ['soc2'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.SALESFORCE,
        category: IntegrationCategory.OAUTH,
        name: 'Salesforce',
        description: 'Connect to Salesforce CRM for customer data',
        logoUrl: '/integrations/salesforce.svg',
        documentationUrl: 'https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.SALESFORCE]!,
        requiredCompliance: ['soc2', 'iso27001'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.QUICKBOOKS,
        category: IntegrationCategory.OAUTH,
        name: 'QuickBooks',
        description: 'Connect to QuickBooks for accounting and invoicing',
        logoUrl: '/integrations/quickbooks.svg',
        documentationUrl: 'https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.QUICKBOOKS]!,
        requiredCompliance: ['soc2'],
        status: 'active',
      },
    ];
  }
}
