import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SendGridCredentials {
  apiKey: string;
}

export interface SendGridTestResult {
  success: boolean;
  message: string;
}

@Injectable()
export class SendGridService {
  private readonly logger = new Logger(SendGridService.name);

  async testConnection(credentials: SendGridCredentials): Promise<SendGridTestResult> {
    try {
      if (!credentials.apiKey) {
        return { success: false, message: 'API Key is required' };
      }

      // Use the scopes endpoint to validate the API key
      const response = await axios.get('https://api.sendgrid.com/v3/scopes', {
        headers: {
          Authorization: `Bearer ${credentials.apiKey}`,
        },
        timeout: 10000,
      });

      const scopes = response.data.scopes || [];
      this.logger.log(`SendGrid connection test successful. Scopes: ${scopes.length}`);

      return {
        success: true,
        message: `Connected to SendGrid (${scopes.length} scopes available)`,
      };
    } catch (error: any) {
      const message = error.response?.data?.errors?.[0]?.message || error.message || 'Unknown error';
      this.logger.error(`SendGrid connection test failed: ${message}`);

      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid API key' };
      }
      if (error.response?.status === 403) {
        return { success: false, message: 'API key lacks required permissions' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
