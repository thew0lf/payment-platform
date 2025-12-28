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
      const result = await this.prisma.integrationDefinition.upsert({
        where: { provider: def.provider as string },
        update: {
          // Update all fields except provider (the unique key)
          category: def.category,
          name: def.name,
          description: def.description,
          logoUrl: def.logoUrl,
          documentationUrl: def.documentationUrl,
          isOrgOnly: def.isOrgOnly,
          isClientAllowed: def.isClientAllowed,
          isPlatformOffered: def.isPlatformOffered,
          authType: def.authType,
          credentialSchema: def.credentialSchema as any,
          requiredCompliance: def.requiredCompliance,
          status: def.status,
        },
        create: def as any,
      });

      // Check if it was an update or create based on createdAt vs updatedAt
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
    }

    this.logger.log(`Integration definitions synced: ${created} created, ${updated} updated`);
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
      // ═══════════════════════════════════════════════════════════════
      // PAYMENT GATEWAYS (Client-configurable)
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.PAYPAL_PAYFLOW,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        name: 'PayPal Payflow Pro',
        description: 'PayPal Payflow Pro payment gateway for direct credit card processing with advanced fraud protection (Beta)',
        logoUrl: '/integrations/paypal.svg',
        documentationUrl: 'https://developer.paypal.com/docs/payflow/',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.PAYPAL_PAYFLOW]!,
        requiredCompliance: ['pci_dss'],
        status: 'beta',
      },
      {
        provider: IntegrationProvider.PAYPAL_REST,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        name: 'PayPal REST',
        description: 'PayPal REST API for PayPal checkout, cards, and digital wallets including Venmo and Pay Later (Beta)',
        logoUrl: '/integrations/paypal.svg',
        documentationUrl: 'https://developer.paypal.com/docs/api/overview/',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: true,
        authType: AuthType.OAUTH2_CLIENT,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.PAYPAL_REST]!,
        requiredCompliance: ['pci_dss'],
        status: 'beta',
      },
      {
        provider: IntegrationProvider.PAYPAL_CLASSIC,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        name: 'PayPal Classic (Legacy)',
        description: 'PayPal Website Payments Pro NVP/SOAP API for legacy integrations. Use PayPal REST for new integrations.',
        logoUrl: '/integrations/paypal.svg',
        documentationUrl: 'https://developer.paypal.com/docs/classic/api/',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: false,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.PAYPAL_CLASSIC]!,
        requiredCompliance: ['pci_dss'],
        status: 'active',  // Legacy but still active for existing merchants
      },
      {
        provider: IntegrationProvider.NMI,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        name: 'NMI',
        description: 'NMI payment gateway with advanced tokenization and recurring billing support',
        logoUrl: '/integrations/nmi.svg',
        documentationUrl: 'https://secure.nmi.com/merchants/resources/integration/integration_portal.php',
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
        description: 'Authorize.Net payment gateway with Accept.js for secure client-side tokenization',
        logoUrl: '/integrations/authorize-net.svg',
        documentationUrl: 'https://developer.authorize.net/api/reference/',
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
        description: 'Stripe payment platform with Elements, Checkout, Payment Intents, and comprehensive subscription billing',
        logoUrl: '/integrations/stripe.svg',
        documentationUrl: 'https://stripe.com/docs/api',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.STRIPE]!,
        requiredCompliance: ['pci_dss', 'soc2'],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // AUTHENTICATION (Org-only)
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.AUTH0,
        category: IntegrationCategory.AUTHENTICATION,
        name: 'Auth0',
        description: 'Auth0 identity platform for SSO, MFA, and social login with enterprise connections',
        logoUrl: '/integrations/auth0.svg',
        documentationUrl: 'https://auth0.com/docs/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.OAUTH2_CLIENT,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AUTH0]!,
        requiredCompliance: ['soc2', 'iso27001', 'gdpr'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.OKTA,
        category: IntegrationCategory.AUTHENTICATION,
        name: 'Okta',
        description: 'Okta workforce identity for enterprise SSO, MFA, and lifecycle management (Beta)',
        logoUrl: '/integrations/okta.svg',
        documentationUrl: 'https://developer.okta.com/docs/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.OKTA]!,
        requiredCompliance: ['soc2', 'iso27001', 'fedramp'],
        status: 'beta',
      },
      {
        provider: IntegrationProvider.COGNITO,
        category: IntegrationCategory.AUTHENTICATION,
        name: 'AWS Cognito',
        description: 'Amazon Cognito for user pools, identity pools, and federated authentication (Beta)',
        logoUrl: '/integrations/aws-cognito.svg',
        documentationUrl: 'https://docs.aws.amazon.com/cognito/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.COGNITO]!,
        requiredCompliance: ['soc2', 'iso27001', 'hipaa'],
        status: 'beta',
      },

      // ═══════════════════════════════════════════════════════════════
      // EMAIL - TRANSACTIONAL (Org-only)
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.AWS_SES,
        category: IntegrationCategory.EMAIL_TRANSACTIONAL,
        name: 'AWS SES',
        description: 'Amazon Simple Email Service for high-volume transactional emails with deliverability insights',
        logoUrl: '/integrations/aws-ses.svg',
        documentationUrl: 'https://docs.aws.amazon.com/ses/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AWS_SES]!,
        requiredCompliance: ['soc2', 'iso27001', 'pci_dss'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.SENDGRID,
        category: IntegrationCategory.EMAIL_TRANSACTIONAL,
        name: 'SendGrid',
        description: 'Twilio SendGrid for transactional and marketing emails with powerful analytics',
        logoUrl: '/integrations/sendgrid.svg',
        documentationUrl: 'https://docs.sendgrid.com/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.SENDGRID]!,
        requiredCompliance: ['soc2', 'iso27001'],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // EMAIL - MARKETING
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.KLAVIYO,
        category: IntegrationCategory.EMAIL_MARKETING,
        name: 'Klaviyo',
        description: 'Klaviyo for email & SMS marketing automation with powerful segmentation and predictive analytics',
        logoUrl: '/integrations/klaviyo.svg',
        documentationUrl: 'https://developers.klaviyo.com/en',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: false,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.KLAVIYO]!,
        requiredCompliance: ['soc2', 'gdpr'],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // SMS (Org-only)
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.TWILIO,
        category: IntegrationCategory.SMS,
        name: 'Twilio',
        description: 'Twilio SMS, MMS, and Voice with global reach and programmable messaging',
        logoUrl: '/integrations/twilio.svg',
        documentationUrl: 'https://www.twilio.com/docs',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.TWILIO]!,
        requiredCompliance: ['soc2', 'iso27001', 'hipaa'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.AWS_SNS,
        category: IntegrationCategory.SMS,
        name: 'AWS SNS',
        description: 'Amazon Simple Notification Service for SMS, push notifications, and pub/sub messaging',
        logoUrl: '/integrations/aws-sns.svg',
        documentationUrl: 'https://docs.aws.amazon.com/sns/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AWS_SNS]!,
        requiredCompliance: ['soc2', 'iso27001', 'pci_dss'],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // AI/ML INTEGRATIONS
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.AWS_BEDROCK,
        category: IntegrationCategory.AI_ML,
        name: 'AWS Bedrock',
        description: 'Amazon Bedrock AI service with Claude, Titan, and other foundation models for content generation and analysis',
        logoUrl: '/integrations/aws-bedrock.svg',
        documentationUrl: 'https://docs.aws.amazon.com/bedrock/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AWS_BEDROCK]!,
        requiredCompliance: ['soc2', 'iso27001', 'hipaa'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.OPENAI,
        category: IntegrationCategory.AI_ML,
        name: 'OpenAI',
        description: 'OpenAI GPT-4 and GPT-3.5 for advanced text generation, embeddings, and vision capabilities',
        logoUrl: '/integrations/openai.svg',
        documentationUrl: 'https://platform.openai.com/docs/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.OPENAI]!,
        requiredCompliance: ['soc2'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.ANTHROPIC,
        category: IntegrationCategory.AI_ML,
        name: 'Anthropic Claude',
        description: 'Anthropic Claude AI for customer service, content generation, and intelligent automation with industry-leading safety',
        logoUrl: '/integrations/anthropic.svg',
        documentationUrl: 'https://docs.anthropic.com/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.ANTHROPIC]!,
        requiredCompliance: ['soc2'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.LANGUAGETOOL,
        category: IntegrationCategory.AI_ML,
        name: 'LanguageTool',
        description: 'Grammar, spelling, and style checking for 30+ languages (Beta - use Bedrock for alpha)',
        logoUrl: '/integrations/languagetool.svg',
        documentationUrl: 'https://languagetool.org/http-api/',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.LANGUAGETOOL]!,
        requiredCompliance: [],
        status: 'beta',
      },

      // ═══════════════════════════════════════════════════════════════
      // STORAGE (Org-only)
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.AWS_S3,
        category: IntegrationCategory.STORAGE,
        name: 'AWS S3',
        description: 'Amazon S3 object storage for product images, documents, and media with lifecycle policies',
        logoUrl: '/integrations/aws-s3.svg',
        documentationUrl: 'https://docs.aws.amazon.com/s3/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AWS_S3]!,
        requiredCompliance: ['soc2', 'iso27001', 'pci_dss', 'hipaa'],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // CDN (Org-only)
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.AWS_CLOUDFRONT,
        category: IntegrationCategory.CDN,
        name: 'AWS CloudFront',
        description: 'Amazon CloudFront CDN for global content delivery with edge locations and signed URLs',
        logoUrl: '/integrations/aws-cloudfront.svg',
        documentationUrl: 'https://docs.aws.amazon.com/cloudfront/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AWS_CLOUDFRONT]!,
        requiredCompliance: ['soc2', 'iso27001', 'pci_dss'],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // DNS (Org-only)
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.AWS_ROUTE53,
        category: IntegrationCategory.DNS,
        name: 'AWS Route 53',
        description: 'Amazon Route 53 for DNS management, health checks, and domain registration',
        logoUrl: '/integrations/aws-route53.svg',
        documentationUrl: 'https://docs.aws.amazon.com/route53/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AWS_ROUTE53]!,
        requiredCompliance: ['soc2', 'iso27001'],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // IMAGE PROCESSING
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.CLOUDINARY,
        category: IntegrationCategory.IMAGE_PROCESSING,
        name: 'Cloudinary',
        description: 'AI-powered image processing for background removal, smart cropping, and enhancement on-demand',
        logoUrl: '/integrations/cloudinary.svg',
        documentationUrl: 'https://cloudinary.com/documentation',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.CLOUDINARY]!,
        requiredCompliance: ['soc2'],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // VIDEO GENERATION
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.RUNWAY,
        category: IntegrationCategory.VIDEO_GENERATION,
        name: 'Runway',
        description: 'Premium AI video generation from images with Gen-3/Gen-4 models for cinematic 4K product videos',
        logoUrl: '/integrations/runway.svg',
        documentationUrl: 'https://docs.dev.runwayml.com/',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.RUNWAY]!,
        requiredCompliance: [],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // LOCATION SERVICES
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.GOOGLE_PLACES,
        category: IntegrationCategory.LOCATION_SERVICES,
        name: 'Google Places',
        description: 'Google Places API for address autocomplete and place details with session-based billing optimization',
        logoUrl: '/integrations/google-places.svg',
        documentationUrl: 'https://developers.google.com/maps/documentation/places/web-service',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.GOOGLE_PLACES]!,
        requiredCompliance: [],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // MONITORING (Org-only)
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.DATADOG,
        category: IntegrationCategory.MONITORING,
        name: 'Datadog',
        description: 'Datadog for infrastructure monitoring, APM, logs, and real-time dashboards',
        logoUrl: '/integrations/datadog.svg',
        documentationUrl: 'https://docs.datadoghq.com/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.DATADOG]!,
        requiredCompliance: ['soc2', 'iso27001', 'hipaa'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.SENTRY,
        category: IntegrationCategory.MONITORING,
        name: 'Sentry',
        description: 'Sentry for error tracking, performance monitoring, and release health',
        logoUrl: '/integrations/sentry.svg',
        documentationUrl: 'https://docs.sentry.io/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.SENTRY]!,
        requiredCompliance: ['soc2', 'gdpr'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.CLOUDWATCH,
        category: IntegrationCategory.MONITORING,
        name: 'AWS CloudWatch',
        description: 'Amazon CloudWatch for logs, metrics, alarms, and application insights',
        logoUrl: '/integrations/aws-cloudwatch.svg',
        documentationUrl: 'https://docs.aws.amazon.com/cloudwatch/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.CLOUDWATCH]!,
        requiredCompliance: ['soc2', 'iso27001', 'pci_dss', 'hipaa'],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // FEATURE FLAGS (Org-only)
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.LAUNCHDARKLY,
        category: IntegrationCategory.FEATURE_FLAGS,
        name: 'LaunchDarkly',
        description: 'LaunchDarkly for feature flags, A/B testing, and progressive rollouts',
        logoUrl: '/integrations/launchdarkly.svg',
        documentationUrl: 'https://docs.launchdarkly.com/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.LAUNCHDARKLY]!,
        requiredCompliance: ['soc2', 'hipaa'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.AWS_APPCONFIG,
        category: IntegrationCategory.FEATURE_FLAGS,
        name: 'AWS AppConfig',
        description: 'AWS AppConfig for feature flags, configuration management, and gradual deployments (Beta)',
        logoUrl: '/integrations/aws-appconfig.svg',
        documentationUrl: 'https://docs.aws.amazon.com/appconfig/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.AWS_APPCONFIG]!,
        requiredCompliance: ['soc2', 'iso27001'],
        status: 'beta',
      },

      // ═══════════════════════════════════════════════════════════════
      // DEPLOYMENT (Org-only)
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.VERCEL,
        category: IntegrationCategory.DEPLOYMENT,
        name: 'Vercel',
        description: 'Vercel platform for deployments, serverless functions, and edge network with automatic CI/CD',
        logoUrl: '/integrations/vercel.svg',
        documentationUrl: 'https://vercel.com/docs',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.VERCEL]!,
        requiredCompliance: ['soc2'],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // FULFILLMENT / DROPSHIP
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.ROASTIFY,
        category: IntegrationCategory.FULFILLMENT,
        name: 'Roastify',
        description: 'Coffee fulfillment and dropship platform for specialty roasters. Import products, manage inventory, and create orders via API.',
        logoUrl: '/integrations/roastify.svg',
        documentationUrl: 'https://www.roastify.app/developer-api',
        isOrgOnly: false,
        isClientAllowed: true,
        isPlatformOffered: false, // OWN mode only - clients bring their own keys
        authType: AuthType.API_KEY,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.ROASTIFY]!,
        requiredCompliance: [],
        status: 'active',
      },

      // ═══════════════════════════════════════════════════════════════
      // OAUTH PROVIDERS (for SSO/data sync)
      // ═══════════════════════════════════════════════════════════════
      {
        provider: IntegrationProvider.GOOGLE,
        category: IntegrationCategory.OAUTH,
        name: 'Google',
        description: 'Connect to Google Workspace services including Calendar, Gmail, Drive, and Analytics (Beta - use Auth0 for login)',
        logoUrl: '/integrations/google.svg',
        documentationUrl: 'https://developers.google.com/identity/protocols/oauth2',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.GOOGLE]!,
        requiredCompliance: ['soc2'],
        status: 'beta',
      },
      {
        provider: IntegrationProvider.MICROSOFT,
        category: IntegrationCategory.OAUTH,
        name: 'Microsoft',
        description: 'Connect to Microsoft 365 services including Outlook, Teams, OneDrive, and SharePoint (Beta - use Auth0 for login)',
        logoUrl: '/integrations/microsoft.svg',
        documentationUrl: 'https://docs.microsoft.com/en-us/azure/active-directory/develop/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.MICROSOFT]!,
        requiredCompliance: ['soc2', 'iso27001'],
        status: 'beta',
      },
      {
        provider: IntegrationProvider.SLACK,
        category: IntegrationCategory.OAUTH,
        name: 'Slack',
        description: 'Connect to Slack for notifications, alerts, and team messaging automation',
        logoUrl: '/integrations/slack.svg',
        documentationUrl: 'https://api.slack.com/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: true,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.SLACK]!,
        requiredCompliance: ['soc2'],
        status: 'active',
      },
      {
        provider: IntegrationProvider.HUBSPOT,
        category: IntegrationCategory.OAUTH,
        name: 'HubSpot',
        description: 'Connect to HubSpot CRM for contacts, deals, tickets, and marketing automation (Beta)',
        logoUrl: '/integrations/hubspot.svg',
        documentationUrl: 'https://developers.hubspot.com/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.HUBSPOT]!,
        requiredCompliance: ['soc2', 'gdpr'],
        status: 'beta',
      },
      {
        provider: IntegrationProvider.SALESFORCE,
        category: IntegrationCategory.OAUTH,
        name: 'Salesforce',
        description: 'Connect to Salesforce CRM for leads, opportunities, accounts, and custom objects (Beta)',
        logoUrl: '/integrations/salesforce.svg',
        documentationUrl: 'https://developer.salesforce.com/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.SALESFORCE]!,
        requiredCompliance: ['soc2', 'iso27001', 'hipaa'],
        status: 'beta',
      },
      {
        provider: IntegrationProvider.QUICKBOOKS,
        category: IntegrationCategory.OAUTH,
        name: 'QuickBooks',
        description: 'Connect to QuickBooks Online for invoicing, expenses, and financial reporting (Beta)',
        logoUrl: '/integrations/quickbooks.svg',
        documentationUrl: 'https://developer.intuit.com/',
        isOrgOnly: true,
        isClientAllowed: false,
        isPlatformOffered: false,
        authType: AuthType.OAUTH2,
        credentialSchema: CREDENTIAL_SCHEMAS[IntegrationProvider.QUICKBOOKS]!,
        requiredCompliance: ['soc2'],
        status: 'beta',
      },
    ];
  }
}
