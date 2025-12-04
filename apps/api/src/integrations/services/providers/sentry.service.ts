import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SentryCredentials {
  authToken: string;
  organizationSlug?: string;
  dsn?: string;
}

export interface SentryTestResult {
  success: boolean;
  message: string;
}

@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);

  async testConnection(credentials: SentryCredentials): Promise<SentryTestResult> {
    try {
      if (!credentials.authToken) {
        return { success: false, message: 'Auth Token is required' };
      }

      // List organizations to validate the auth token
      const response = await axios.get('https://sentry.io/api/0/organizations/', {
        headers: {
          Authorization: `Bearer ${credentials.authToken}`,
        },
        timeout: 10000,
      });

      const orgs = response.data || [];
      const orgNames = orgs.map((o: any) => o.slug).join(', ');

      this.logger.log(`Sentry connection test successful. Organizations: ${orgs.length}`);

      return {
        success: true,
        message: `Connected to Sentry (${orgs.length} organization${orgs.length !== 1 ? 's' : ''}: ${orgNames || 'none'})`,
      };
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Unknown error';
      this.logger.error(`Sentry connection test failed: ${message}`);

      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid auth token' };
      }
      if (error.response?.status === 403) {
        return { success: false, message: 'Auth token lacks required permissions' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
