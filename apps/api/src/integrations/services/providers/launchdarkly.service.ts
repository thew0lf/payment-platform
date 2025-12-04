import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface LaunchDarklyCredentials {
  apiKey: string;  // Access token
  sdkKey?: string; // SDK key for client-side
  clientSideId?: string;
}

export interface LaunchDarklyTestResult {
  success: boolean;
  message: string;
}

@Injectable()
export class LaunchDarklyService {
  private readonly logger = new Logger(LaunchDarklyService.name);

  async testConnection(credentials: LaunchDarklyCredentials): Promise<LaunchDarklyTestResult> {
    try {
      if (!credentials.apiKey) {
        return { success: false, message: 'API Access Token is required' };
      }

      // List projects to validate the access token
      const response = await axios.get('https://app.launchdarkly.com/api/v2/projects', {
        headers: {
          Authorization: credentials.apiKey,
        },
        timeout: 10000,
      });

      const projects = response.data.items || [];

      this.logger.log(`LaunchDarkly connection test successful. Projects: ${projects.length}`);

      return {
        success: true,
        message: `Connected to LaunchDarkly (${projects.length} project${projects.length !== 1 ? 's' : ''})`,
      };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Unknown error';
      this.logger.error(`LaunchDarkly connection test failed: ${message}`);

      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid access token' };
      }
      if (error.response?.status === 403) {
        return { success: false, message: 'Access token lacks required permissions' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
