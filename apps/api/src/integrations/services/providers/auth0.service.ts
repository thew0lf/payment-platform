import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface Auth0Credentials {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
}

export interface Auth0TestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: {
    tokenEndpoint?: string;
    accessToken?: boolean;
    expiresIn?: number;
  };
}

/**
 * Auth0 Service - Authentication Provider Integration
 *
 * This service handles Auth0 integration for:
 * - Testing connection/credentials
 * - Fetching management API tokens
 * - User management operations
 */
@Injectable()
export class Auth0Service {
  private readonly logger = new Logger(Auth0Service.name);

  /**
   * Test connection to Auth0 by attempting to get an access token
   * Uses the client credentials flow to validate the credentials
   */
  async testConnection(credentials: Auth0Credentials): Promise<Auth0TestResult> {
    const startTime = Date.now();

    // Validate required credentials
    if (!credentials.domain || !credentials.clientId || !credentials.clientSecret || !credentials.audience) {
      return {
        success: false,
        message: 'Missing required credentials: domain, clientId, clientSecret, and audience are required',
        latencyMs: Date.now() - startTime,
      };
    }

    // Normalize domain (remove https:// if present, ensure no trailing slash)
    const domain = credentials.domain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    const tokenUrl = `https://${domain}/oauth/token`;

    try {
      // Attempt to get an access token using client credentials grant
      const response = await axios.post(
        tokenUrl,
        {
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          audience: credentials.audience,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (response.data?.access_token) {
        return {
          success: true,
          message: 'Successfully connected to Auth0 and obtained access token',
          latencyMs: Date.now() - startTime,
          details: {
            tokenEndpoint: tokenUrl,
            accessToken: true,
            expiresIn: response.data.expires_in,
          },
        };
      }

      return {
        success: false,
        message: 'Auth0 returned an unexpected response without access token',
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      this.logger.error('Auth0 test connection error:', error.response?.data || error.message);

      let errorMessage = 'Connection failed';

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          errorMessage = 'Invalid client credentials (client_id or client_secret)';
        } else if (status === 403) {
          errorMessage = 'Access denied - check audience and client permissions';
        } else if (status === 404) {
          errorMessage = `Invalid domain: ${domain} not found`;
        } else if (errorData?.error_description) {
          errorMessage = errorData.error_description;
        } else if (errorData?.error) {
          errorMessage = `Auth0 error: ${errorData.error}`;
        } else {
          errorMessage = `HTTP ${status}: ${error.message}`;
        }
      } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        errorMessage = `Cannot resolve domain: ${domain}`;
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout - check domain and network';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get an access token for Auth0 Management API
   * Used for user management operations
   */
  async getManagementToken(credentials: Auth0Credentials): Promise<string | null> {
    const domain = credentials.domain
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');

    const tokenUrl = `https://${domain}/oauth/token`;

    try {
      const response = await axios.post(
        tokenUrl,
        {
          grant_type: 'client_credentials',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          audience: credentials.audience,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      return response.data?.access_token || null;
    } catch (error: any) {
      this.logger.error('Failed to get Auth0 management token:', error.message);
      return null;
    }
  }
}
