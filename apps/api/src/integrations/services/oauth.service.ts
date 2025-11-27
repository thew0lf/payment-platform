import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialEncryptionService } from './credential-encryption.service';
import { OAuthTokenStatus, OAuthFlowType, AuthType } from '@prisma/client';
import { OAuthTokenCredentials } from '../types/integration.types';
import * as crypto from 'crypto';

// OAuth provider configurations
export interface OAuthProviderConfig {
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  revokeUrl?: string;
  scopes: string[];
  additionalParams?: Record<string, string>;
  pkceRequired?: boolean;
}

// Token response from OAuth provider
export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  // Provider-specific fields
  [key: string]: unknown;
}

// OAuth state data stored during flow
export interface OAuthStateData {
  provider: string;
  organizationId?: string;
  clientId?: string;
  userId: string;
  flowType: OAuthFlowType;
  redirectUrl?: string;
  codeVerifier?: string; // For PKCE
  metadata?: Record<string, unknown>;
}

// Provider-specific OAuth configurations
const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  // Google (Gmail, Drive, etc.)
  GOOGLE: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    scopes: ['openid', 'email', 'profile'],
    additionalParams: { access_type: 'offline', prompt: 'consent' },
    pkceRequired: false,
  },
  // Microsoft (Outlook, Office 365)
  MICROSOFT: {
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'email', 'profile', 'offline_access'],
    pkceRequired: true,
  },
  // Slack
  SLACK: {
    authorizationUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    userInfoUrl: 'https://slack.com/api/users.identity',
    revokeUrl: 'https://slack.com/api/auth.revoke',
    scopes: ['channels:read', 'chat:write', 'users:read'],
    pkceRequired: false,
  },
  // HubSpot
  HUBSPOT: {
    authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    userInfoUrl: 'https://api.hubapi.com/oauth/v1/access-tokens',
    scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
    pkceRequired: false,
  },
  // Salesforce
  SALESFORCE: {
    authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    userInfoUrl: 'https://login.salesforce.com/services/oauth2/userinfo',
    revokeUrl: 'https://login.salesforce.com/services/oauth2/revoke',
    scopes: ['api', 'refresh_token', 'offline_access'],
    pkceRequired: false,
  },
  // Stripe Connect
  STRIPE_CONNECT: {
    authorizationUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    revokeUrl: 'https://connect.stripe.com/oauth/deauthorize',
    scopes: ['read_write'],
    additionalParams: { response_type: 'code' },
    pkceRequired: false,
  },
  // QuickBooks
  QUICKBOOKS: {
    authorizationUrl: 'https://appcenter.intuit.com/connect/oauth2',
    tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    userInfoUrl: 'https://accounts.platform.intuit.com/v1/openid_connect/userinfo',
    revokeUrl: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
    scopes: ['com.intuit.quickbooks.accounting'],
    pkceRequired: false,
  },
  // Shopify
  SHOPIFY: {
    authorizationUrl: '', // Dynamic based on shop
    tokenUrl: '', // Dynamic based on shop
    scopes: ['read_products', 'read_orders', 'read_customers'],
    pkceRequired: false,
  },
  // Xero
  XERO: {
    authorizationUrl: 'https://login.xero.com/identity/connect/authorize',
    tokenUrl: 'https://identity.xero.com/connect/token',
    userInfoUrl: 'https://api.xero.com/connections',
    scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'offline_access'],
    pkceRequired: true,
  },
  // Mailchimp
  MAILCHIMP: {
    authorizationUrl: 'https://login.mailchimp.com/oauth2/authorize',
    tokenUrl: 'https://login.mailchimp.com/oauth2/token',
    userInfoUrl: 'https://login.mailchimp.com/oauth2/metadata',
    scopes: [],
    pkceRequired: false,
  },
};

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private readonly stateExpirationMinutes = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly encryptionService: CredentialEncryptionService,
  ) {}

  /**
   * Get OAuth configuration for a provider
   */
  getProviderConfig(provider: string): OAuthProviderConfig | null {
    return OAUTH_PROVIDERS[provider.toUpperCase()] || null;
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  async generateAuthorizationUrl(params: {
    provider: string;
    organizationId?: string;
    clientId?: string;
    userId: string;
    flowType: OAuthFlowType;
    redirectUrl?: string;
    additionalScopes?: string[];
    shopDomain?: string; // For Shopify
  }): Promise<{ authorizationUrl: string; state: string }> {
    const config = this.getProviderConfig(params.provider);
    if (!config) {
      throw new BadRequestException(`Unknown OAuth provider: ${params.provider}`);
    }

    // Get client credentials from IntegrationDefinition
    const definition = await this.prisma.integrationDefinition.findUnique({
      where: { provider: params.provider.toUpperCase() },
    });

    if (!definition || definition.authType !== AuthType.OAUTH2) {
      throw new BadRequestException(`Provider ${params.provider} is not configured for OAuth`);
    }

    const oauthConfig = definition.oauthConfig as Record<string, unknown> | null;
    const clientId = oauthConfig?.clientId as string;

    if (!clientId) {
      throw new BadRequestException(`OAuth client ID not configured for ${params.provider}`);
    }

    // Generate state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Generate PKCE code verifier if required
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;
    if (config.pkceRequired) {
      codeVerifier = crypto.randomBytes(32).toString('base64url');
      codeChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
    }

    // Store state in database
    const expiresAt = new Date(Date.now() + this.stateExpirationMinutes * 60 * 1000);
    await this.prisma.oAuthState.create({
      data: {
        state,
        provider: params.provider.toUpperCase(),
        organizationId: params.organizationId,
        clientId: params.clientId,
        userId: params.userId,
        flowType: params.flowType,
        redirectUrl: params.redirectUrl,
        metadata: codeVerifier ? { codeVerifier } : undefined,
        expiresAt,
      },
    });

    // Build callback URL
    const baseUrl = this.configService.get<string>('API_URL') || 'http://api.dev.avnz.io:3001';
    const redirectUri = `${baseUrl}/api/integrations/oauth/callback`;

    // Build authorization URL
    let authUrl = config.authorizationUrl;

    // Handle Shopify dynamic URL
    if (params.provider.toUpperCase() === 'SHOPIFY' && params.shopDomain) {
      authUrl = `https://${params.shopDomain}/admin/oauth/authorize`;
    }

    const scopes = [...config.scopes, ...(params.additionalScopes || [])];

    const urlParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      ...(config.additionalParams || {}),
    });

    // Add PKCE challenge if required
    if (codeChallenge) {
      urlParams.set('code_challenge', codeChallenge);
      urlParams.set('code_challenge_method', 'S256');
    }

    const authorizationUrl = `${authUrl}?${urlParams.toString()}`;

    this.logger.log(`Generated OAuth authorization URL for provider ${params.provider}`);

    return { authorizationUrl, state };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(params: {
    code: string;
    state: string;
    error?: string;
    errorDescription?: string;
  }): Promise<{
    success: boolean;
    integrationId?: string;
    flowType?: OAuthFlowType;
    redirectUrl?: string;
    error?: string;
  }> {
    // Check for OAuth error
    if (params.error) {
      this.logger.error(`OAuth error: ${params.error} - ${params.errorDescription}`);
      return { success: false, error: params.errorDescription || params.error };
    }

    // Validate and retrieve state
    const stateRecord = await this.prisma.oAuthState.findUnique({
      where: { state: params.state },
    });

    if (!stateRecord) {
      return { success: false, error: 'Invalid or expired state' };
    }

    if (stateRecord.usedAt) {
      return { success: false, error: 'State has already been used' };
    }

    if (stateRecord.expiresAt < new Date()) {
      return { success: false, error: 'State has expired' };
    }

    // Mark state as used
    await this.prisma.oAuthState.update({
      where: { id: stateRecord.id },
      data: { usedAt: new Date() },
    });

    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens({
        provider: stateRecord.provider,
        code: params.code,
        codeVerifier: (stateRecord.metadata as Record<string, unknown>)?.codeVerifier as string | undefined,
      });

      // Store tokens
      const integrationId = await this.storeTokens({
        provider: stateRecord.provider,
        organizationId: stateRecord.organizationId,
        clientId: stateRecord.clientId,
        userId: stateRecord.userId,
        flowType: stateRecord.flowType,
        tokens,
      });

      return {
        success: true,
        integrationId,
        flowType: stateRecord.flowType,
        redirectUrl: stateRecord.redirectUrl || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to exchange OAuth code: ${error.message}`);
      return { success: false, error: 'Failed to complete OAuth authorization' };
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(params: {
    provider: string;
    code: string;
    codeVerifier?: string;
    shopDomain?: string; // For Shopify
  }): Promise<OAuthTokenResponse> {
    const config = this.getProviderConfig(params.provider);
    if (!config) {
      throw new BadRequestException(`Unknown OAuth provider: ${params.provider}`);
    }

    // Get client credentials
    const definition = await this.prisma.integrationDefinition.findUnique({
      where: { provider: params.provider.toUpperCase() },
    });

    const oauthConfig = definition?.oauthConfig as Record<string, unknown> | null;
    const clientId = oauthConfig?.clientId as string;
    const clientSecret = oauthConfig?.clientSecret as string;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(`OAuth credentials not configured for ${params.provider}`);
    }

    const baseUrl = this.configService.get<string>('API_URL') || 'http://api.dev.avnz.io:3001';
    const redirectUri = `${baseUrl}/api/integrations/oauth/callback`;

    let tokenUrl = config.tokenUrl;

    // Handle Shopify dynamic URL
    if (params.provider.toUpperCase() === 'SHOPIFY' && params.shopDomain) {
      tokenUrl = `https://${params.shopDomain}/admin/oauth/access_token`;
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    if (params.codeVerifier) {
      body.set('code_verifier', params.codeVerifier);
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      this.logger.error(`Token exchange failed: ${response.status} - ${errorData}`);
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Store OAuth tokens in database
   */
  private async storeTokens(params: {
    provider: string;
    organizationId?: string | null;
    clientId?: string | null;
    userId: string;
    flowType: OAuthFlowType;
    tokens: OAuthTokenResponse;
  }): Promise<string> {
    // Calculate expiration time
    const expiresAt = params.tokens.expires_in
      ? new Date(Date.now() + params.tokens.expires_in * 1000)
      : null;

    // Encrypt tokens
    const encryptedAccessToken = this.encryptionService.encrypt({
      token: params.tokens.access_token,
    });
    const encryptedRefreshToken = params.tokens.refresh_token
      ? this.encryptionService.encrypt({ token: params.tokens.refresh_token })
      : null;

    // Create or update integration based on flow type
    if (params.flowType === OAuthFlowType.PLATFORM && params.organizationId) {
      // Platform-level integration
      const integration = await this.prisma.platformIntegration.upsert({
        where: {
          organizationId_provider: {
            organizationId: params.organizationId,
            provider: params.provider,
          },
        },
        create: {
          organizationId: params.organizationId,
          provider: params.provider,
          category: 'OAUTH',
          name: `${params.provider} OAuth`,
          credentials: {}, // OAuth uses tokens, not static credentials
          status: 'ACTIVE',
          createdBy: params.userId,
        },
        update: {
          status: 'ACTIVE',
          updatedBy: params.userId,
        },
      });

      // Store token
      await this.prisma.oAuthToken.upsert({
        where: {
          id: (await this.prisma.oAuthToken.findFirst({
            where: { platformIntegrationId: integration.id },
          }))?.id || '',
        },
        create: {
          platformIntegrationId: integration.id,
          accessToken: JSON.stringify(encryptedAccessToken),
          refreshToken: encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
          tokenType: params.tokens.token_type || 'Bearer',
          expiresAt,
          scopes: params.tokens.scope ? params.tokens.scope.split(' ') : [],
          status: OAuthTokenStatus.ACTIVE,
        },
        update: {
          accessToken: JSON.stringify(encryptedAccessToken),
          refreshToken: encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
          tokenType: params.tokens.token_type || 'Bearer',
          expiresAt,
          scopes: params.tokens.scope ? params.tokens.scope.split(' ') : [],
          status: OAuthTokenStatus.ACTIVE,
          lastRefreshedAt: new Date(),
        },
      });

      return integration.id;
    } else if (params.flowType === OAuthFlowType.CLIENT && params.clientId) {
      // Client-level integration
      const integration = await this.prisma.clientIntegration.upsert({
        where: {
          clientId_provider_name: {
            clientId: params.clientId,
            provider: params.provider,
            name: `${params.provider} OAuth`,
          },
        },
        create: {
          clientId: params.clientId,
          provider: params.provider,
          category: 'OAUTH',
          name: `${params.provider} OAuth`,
          mode: 'OWN',
          credentials: {},
          status: 'ACTIVE',
          createdBy: params.userId,
        },
        update: {
          status: 'ACTIVE',
          updatedBy: params.userId,
        },
      });

      // Store token
      await this.prisma.oAuthToken.upsert({
        where: {
          id: (await this.prisma.oAuthToken.findFirst({
            where: { clientIntegrationId: integration.id },
          }))?.id || '',
        },
        create: {
          clientIntegrationId: integration.id,
          accessToken: JSON.stringify(encryptedAccessToken),
          refreshToken: encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
          tokenType: params.tokens.token_type || 'Bearer',
          expiresAt,
          scopes: params.tokens.scope ? params.tokens.scope.split(' ') : [],
          status: OAuthTokenStatus.ACTIVE,
        },
        update: {
          accessToken: JSON.stringify(encryptedAccessToken),
          refreshToken: encryptedRefreshToken ? JSON.stringify(encryptedRefreshToken) : null,
          tokenType: params.tokens.token_type || 'Bearer',
          expiresAt,
          scopes: params.tokens.scope ? params.tokens.scope.split(' ') : [],
          status: OAuthTokenStatus.ACTIVE,
          lastRefreshedAt: new Date(),
        },
      });

      return integration.id;
    }

    throw new BadRequestException('Invalid OAuth flow type or missing organization/client ID');
  }

  /**
   * Get access token for an integration (refreshing if needed)
   */
  async getAccessToken(params: {
    platformIntegrationId?: string;
    clientIntegrationId?: string;
  }): Promise<string> {
    const token = await this.prisma.oAuthToken.findFirst({
      where: {
        OR: [
          { platformIntegrationId: params.platformIntegrationId },
          { clientIntegrationId: params.clientIntegrationId },
        ],
        status: OAuthTokenStatus.ACTIVE,
      },
    });

    if (!token) {
      throw new NotFoundException('OAuth token not found');
    }

    // Check if token needs refresh (with 5 minute buffer)
    if (token.expiresAt && token.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
      if (token.refreshToken) {
        return this.refreshAccessToken(token.id);
      } else {
        await this.prisma.oAuthToken.update({
          where: { id: token.id },
          data: { status: OAuthTokenStatus.EXPIRED },
        });
        throw new BadRequestException('OAuth token expired and no refresh token available');
      }
    }

    // Decrypt and return access token
    const encrypted = JSON.parse(token.accessToken);
    const decrypted = this.encryptionService.decrypt(encrypted) as OAuthTokenCredentials;

    // Update last used
    await this.prisma.oAuthToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    });

    return decrypted.token;
  }

  /**
   * Refresh an OAuth access token
   */
  async refreshAccessToken(tokenId: string): Promise<string> {
    const token = await this.prisma.oAuthToken.findUnique({
      where: { id: tokenId },
    });

    if (!token || !token.refreshToken) {
      throw new BadRequestException('Cannot refresh token: no refresh token available');
    }

    // Get provider from integration
    let provider: string;
    if (token.platformIntegrationId) {
      const integration = await this.prisma.platformIntegration.findUnique({
        where: { id: token.platformIntegrationId },
      });
      provider = integration?.provider || '';
    } else if (token.clientIntegrationId) {
      const integration = await this.prisma.clientIntegration.findUnique({
        where: { id: token.clientIntegrationId },
      });
      provider = integration?.provider || '';
    } else {
      throw new BadRequestException('Token not associated with any integration');
    }

    const config = this.getProviderConfig(provider);
    if (!config) {
      throw new BadRequestException(`Unknown OAuth provider: ${provider}`);
    }

    // Get client credentials
    const definition = await this.prisma.integrationDefinition.findUnique({
      where: { provider: provider.toUpperCase() },
    });

    const oauthConfig = definition?.oauthConfig as Record<string, unknown> | null;
    const clientId = oauthConfig?.clientId as string;
    const clientSecret = oauthConfig?.clientSecret as string;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(`OAuth credentials not configured for ${provider}`);
    }

    // Decrypt refresh token
    const encryptedRefresh = JSON.parse(token.refreshToken);
    const decryptedRefresh = this.encryptionService.decrypt(encryptedRefresh) as OAuthTokenCredentials;

    // Request new tokens
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decryptedRefresh.token,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      this.logger.error(`Token refresh failed: ${response.status} - ${errorData}`);

      await this.prisma.oAuthToken.update({
        where: { id: tokenId },
        data: {
          status: OAuthTokenStatus.REFRESH_FAILED,
          errorMessage: `Refresh failed: ${response.status}`,
        },
      });

      throw new BadRequestException('Failed to refresh OAuth token');
    }

    const tokens: OAuthTokenResponse = await response.json();

    // Encrypt and update tokens
    const encryptedAccessToken = this.encryptionService.encrypt({
      token: tokens.access_token,
    });
    const encryptedRefreshToken = tokens.refresh_token
      ? this.encryptionService.encrypt({ token: tokens.refresh_token })
      : null;

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await this.prisma.oAuthToken.update({
      where: { id: tokenId },
      data: {
        accessToken: JSON.stringify(encryptedAccessToken),
        refreshToken: encryptedRefreshToken
          ? JSON.stringify(encryptedRefreshToken)
          : token.refreshToken, // Keep old refresh token if not returned
        expiresAt,
        status: OAuthTokenStatus.ACTIVE,
        lastRefreshedAt: new Date(),
        errorMessage: null,
      },
    });

    this.logger.log(`Successfully refreshed OAuth token for ${provider}`);

    return tokens.access_token;
  }

  /**
   * Revoke OAuth tokens
   */
  async revokeToken(params: {
    platformIntegrationId?: string;
    clientIntegrationId?: string;
  }): Promise<void> {
    const token = await this.prisma.oAuthToken.findFirst({
      where: {
        OR: [
          { platformIntegrationId: params.platformIntegrationId },
          { clientIntegrationId: params.clientIntegrationId },
        ],
      },
    });

    if (!token) {
      throw new NotFoundException('OAuth token not found');
    }

    // Get provider
    let provider: string;
    if (token.platformIntegrationId) {
      const integration = await this.prisma.platformIntegration.findUnique({
        where: { id: token.platformIntegrationId },
      });
      provider = integration?.provider || '';
    } else if (token.clientIntegrationId) {
      const integration = await this.prisma.clientIntegration.findUnique({
        where: { id: token.clientIntegrationId },
      });
      provider = integration?.provider || '';
    } else {
      throw new BadRequestException('Token not associated with any integration');
    }

    const config = this.getProviderConfig(provider);

    // Try to revoke at provider if revoke URL exists
    if (config?.revokeUrl) {
      try {
        const encrypted = JSON.parse(token.accessToken);
        const decrypted = this.encryptionService.decrypt(encrypted) as OAuthTokenCredentials;

        await fetch(config.revokeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ token: decrypted.token }).toString(),
        });
      } catch (error) {
        this.logger.warn(`Failed to revoke token at provider: ${error.message}`);
      }
    }

    // Mark as revoked in our database
    await this.prisma.oAuthToken.update({
      where: { id: token.id },
      data: { status: OAuthTokenStatus.REVOKED },
    });

    this.logger.log(`Revoked OAuth token for ${provider}`);
  }

  /**
   * Get all available OAuth providers
   */
  getAvailableProviders(): string[] {
    return Object.keys(OAUTH_PROVIDERS);
  }

  /**
   * Clean up expired OAuth states
   */
  async cleanupExpiredStates(): Promise<number> {
    const result = await this.prisma.oAuthState.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired OAuth states`);
    }

    return result.count;
  }
}
