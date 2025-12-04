import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface DatadogCredentials {
  apiKey: string;
  appKey?: string;
  site?: string; // e.g., 'datadoghq.com', 'datadoghq.eu'
}

export interface DatadogTestResult {
  success: boolean;
  message: string;
}

@Injectable()
export class DatadogService {
  private readonly logger = new Logger(DatadogService.name);

  private getBaseUrl(site?: string): string {
    const domain = site || 'datadoghq.com';
    return `https://api.${domain}`;
  }

  async testConnection(credentials: DatadogCredentials): Promise<DatadogTestResult> {
    try {
      if (!credentials.apiKey) {
        return { success: false, message: 'API Key is required' };
      }

      const baseUrl = this.getBaseUrl(credentials.site);

      // Validate API key
      const response = await axios.get(`${baseUrl}/api/v1/validate`, {
        headers: {
          'DD-API-KEY': credentials.apiKey,
        },
        timeout: 10000,
      });

      if (response.data.valid !== true) {
        return { success: false, message: 'API key is invalid' };
      }

      this.logger.log('Datadog connection test successful');

      return {
        success: true,
        message: `Connected to Datadog (${credentials.site || 'datadoghq.com'})`,
      };
    } catch (error: any) {
      const message = error.response?.data?.errors?.[0] || error.message || 'Unknown error';
      this.logger.error(`Datadog connection test failed: ${message}`);

      if (error.response?.status === 403) {
        return { success: false, message: 'Invalid API key' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
