import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
}

@Injectable()
export class Auth0Service {
  private readonly logger = new Logger(Auth0Service.name);
  private cachedConfig: Auth0Config | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if Auth0 integration is configured and active
   */
  async isAuth0Enabled(): Promise<boolean> {
    const config = await this.getAuth0Config();
    return config !== null;
  }

  /**
   * Get Auth0 configuration from the platform integration
   * Returns null if not configured or not active
   */
  async getAuth0Config(): Promise<Auth0Config | null> {
    // Check cache first
    if (this.cachedConfig && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cachedConfig;
    }

    try {
      // Find active Auth0 platform integration
      const integration = await this.prisma.platformIntegration.findFirst({
        where: {
          provider: 'AUTH0',
          status: 'ACTIVE',
        },
        select: {
          id: true,
          credentials: true,
        },
      });

      if (!integration) {
        this.logger.debug('No active Auth0 integration found');
        this.cachedConfig = null;
        return null;
      }

      const credentials = integration.credentials as Record<string, string>;

      // Validate required fields
      if (!credentials.domain || !credentials.clientId || !credentials.clientSecret || !credentials.audience) {
        this.logger.warn('Auth0 integration missing required credentials');
        this.cachedConfig = null;
        return null;
      }

      this.cachedConfig = {
        domain: credentials.domain,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        audience: credentials.audience,
      };
      this.cacheTimestamp = Date.now();

      this.logger.debug(`Auth0 config loaded from integration, domain: ${this.cachedConfig.domain}`);
      return this.cachedConfig;
    } catch (error) {
      this.logger.error('Error fetching Auth0 config:', error);
      return null;
    }
  }

  /**
   * Get the JWKS URI for Auth0 token verification
   */
  async getJwksUri(): Promise<string | null> {
    const config = await this.getAuth0Config();
    if (!config) return null;
    return `https://${config.domain}/.well-known/jwks.json`;
  }

  /**
   * Get the issuer URL for token validation
   */
  async getIssuer(): Promise<string | null> {
    const config = await this.getAuth0Config();
    if (!config) return null;
    return `https://${config.domain}/`;
  }

  /**
   * Clear the cached config (useful after integration update)
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.cacheTimestamp = 0;
  }
}
