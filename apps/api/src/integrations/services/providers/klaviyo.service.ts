import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface KlaviyoCredentials {
  apiKey: string;  // Private API key
  publicKey?: string; // Site ID / Public API key
}

export interface KlaviyoTestResult {
  success: boolean;
  message: string;
}

@Injectable()
export class KlaviyoService {
  private readonly logger = new Logger(KlaviyoService.name);

  async testConnection(credentials: KlaviyoCredentials): Promise<KlaviyoTestResult> {
    try {
      if (!credentials.apiKey) {
        return { success: false, message: 'API Key is required' };
      }

      // Get account info to validate API key
      const response = await axios.get('https://a.klaviyo.com/api/accounts/', {
        headers: {
          Authorization: `Klaviyo-API-Key ${credentials.apiKey}`,
          revision: '2024-02-15',
        },
        timeout: 10000,
      });

      const accounts = response.data.data || [];
      const accountName = accounts[0]?.attributes?.contact_information?.organization_name || 'Unknown';

      this.logger.log(`Klaviyo connection test successful. Account: ${accountName}`);

      return {
        success: true,
        message: `Connected to Klaviyo: ${accountName}`,
      };
    } catch (error: any) {
      const message = error.response?.data?.errors?.[0]?.detail || error.message || 'Unknown error';
      this.logger.error(`Klaviyo connection test failed: ${message}`);

      if (error.response?.status === 401 || error.response?.status === 403) {
        return { success: false, message: 'Invalid API key' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
