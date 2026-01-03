import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { CredentialEncryptionService } from './services/credential-encryption.service';
import { IntegrationDefinitionService } from './services/integration-definition.service';
import { PlatformIntegrationService } from './services/platform-integration.service';
import { ClientIntegrationService } from './services/client-integration.service';
import { IntegrationSyncService } from './services/integration-sync.service';
import { OAuthService } from './services/oauth.service';
import { OAuthTokenRefreshService } from './services/oauth-token-refresh.service';
import { PlatformIntegrationsController, ClientIntegrationsController, OAuthController } from './integrations.controller';
import { IntegrationUsageController } from './controllers/integration-usage.controller';
import { IntegrationUsageService } from './services/integration-usage.service';
// Failover Service
import { IntegrationFailoverService } from './services/integration-failover.service';
// Provider Services
import { Auth0Service } from './services/providers/auth0.service';
import { BedrockService } from './services/providers/bedrock.service';
import { S3StorageService } from './services/providers/s3-storage.service';
import { LanguageToolService } from './services/providers/languagetool.service';
import { CloudinaryService } from './services/providers/cloudinary.service';
import { RunwayService } from './services/providers/runway.service';
import { TwilioService } from './services/providers/twilio.service';
import { CloudFrontService } from './services/providers/cloudfront.service';
import { Route53Service } from './services/providers/route53.service';
import { CloudWatchService } from './services/providers/cloudwatch.service';
// Payment Gateway Services
import { StripeService } from './services/providers/stripe.service';
import { PayPalClassicService } from './services/providers/paypal-classic.service';
import { NMIService } from './services/providers/nmi.service';
import { AuthorizeNetService } from './services/providers/authorize-net.service';
// AWS Services
import { AWSSESService } from './services/providers/aws-ses.service';
import { AWSSNSService } from './services/providers/aws-sns.service';
// Email & Marketing Services
import { SendGridService } from './services/providers/sendgrid.service';
import { KlaviyoService } from './services/providers/klaviyo.service';
// AI Services
import { OpenAIService } from './services/providers/openai.service';
import { AnthropicService } from './services/providers/anthropic.service';
// Monitoring Services
import { DatadogService } from './services/providers/datadog.service';
import { SentryService } from './services/providers/sentry.service';
// Feature Flags
import { LaunchDarklyService } from './services/providers/launchdarkly.service';
// Deployment
import { VercelService } from './services/providers/vercel.service';
// OAuth/Communication
import { SlackService } from './services/providers/slack.service';
// Fulfillment Providers
import { RoastifyService } from './services/providers/roastify.service';
// Location Services
import { GooglePlacesService } from './services/providers/google-places.service';
// Stock Images
import { StockImageService } from './services/providers/stock-image.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', maxListeners: 20 })],
  controllers: [PlatformIntegrationsController, ClientIntegrationsController, OAuthController, IntegrationUsageController],
  providers: [
    CredentialEncryptionService,
    IntegrationDefinitionService,
    PlatformIntegrationService,
    ClientIntegrationService,
    IntegrationSyncService,
    IntegrationUsageService,
    OAuthService,
    OAuthTokenRefreshService,
    // Failover Service
    IntegrationFailoverService,
    // Provider Services
    Auth0Service,
    BedrockService,
    S3StorageService,
    LanguageToolService,
    CloudinaryService,
    RunwayService,
    TwilioService,
    CloudFrontService,
    Route53Service,
    CloudWatchService,
    // Payment Gateway Services
    StripeService,
    PayPalClassicService,
    NMIService,
    AuthorizeNetService,
    // AWS Services
    AWSSESService,
    AWSSNSService,
    // Email & Marketing Services
    SendGridService,
    KlaviyoService,
    // AI Services
    OpenAIService,
    AnthropicService,
    // Monitoring Services
    DatadogService,
    SentryService,
    // Feature Flags
    LaunchDarklyService,
    // Deployment
    VercelService,
    // OAuth/Communication
    SlackService,
    // Location Services
    GooglePlacesService,
    // Fulfillment Providers
    RoastifyService,
    // Stock Images
    StockImageService,
  ],
  exports: [
    CredentialEncryptionService,
    IntegrationDefinitionService,
    PlatformIntegrationService,
    ClientIntegrationService,
    IntegrationUsageService,
    OAuthService,
    OAuthTokenRefreshService,
    // Failover Service
    IntegrationFailoverService,
    // Provider Services
    Auth0Service,
    BedrockService,
    S3StorageService,
    LanguageToolService,
    CloudinaryService,
    RunwayService,
    TwilioService,
    CloudFrontService,
    Route53Service,
    CloudWatchService,
    // Payment Gateway Services
    StripeService,
    PayPalClassicService,
    NMIService,
    AuthorizeNetService,
    // AWS Services
    AWSSESService,
    AWSSNSService,
    // Email & Marketing Services
    SendGridService,
    KlaviyoService,
    // AI Services
    OpenAIService,
    AnthropicService,
    // Monitoring Services
    DatadogService,
    SentryService,
    // Feature Flags
    LaunchDarklyService,
    // Deployment
    VercelService,
    // OAuth/Communication
    SlackService,
    // Location Services
    GooglePlacesService,
    // Fulfillment Providers
    RoastifyService,
    // Stock Images
    StockImageService,
  ],
})
export class IntegrationsModule {}
