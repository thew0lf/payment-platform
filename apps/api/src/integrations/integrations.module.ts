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

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', maxListeners: 20 })],
  controllers: [PlatformIntegrationsController, ClientIntegrationsController, OAuthController],
  providers: [CredentialEncryptionService, IntegrationDefinitionService, PlatformIntegrationService, ClientIntegrationService, IntegrationSyncService, OAuthService, OAuthTokenRefreshService],
  exports: [CredentialEncryptionService, IntegrationDefinitionService, PlatformIntegrationService, ClientIntegrationService, OAuthService, OAuthTokenRefreshService],
})
export class IntegrationsModule {}
