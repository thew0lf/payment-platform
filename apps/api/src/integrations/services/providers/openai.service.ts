import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface OpenAICredentials {
  apiKey: string;
  organizationId?: string;
}

export interface OpenAITestResult {
  success: boolean;
  message: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);

  async testConnection(credentials: OpenAICredentials): Promise<OpenAITestResult> {
    try {
      if (!credentials.apiKey) {
        return { success: false, message: 'API Key is required' };
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${credentials.apiKey}`,
      };

      if (credentials.organizationId) {
        headers['OpenAI-Organization'] = credentials.organizationId;
      }

      // List models to validate API key
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers,
        timeout: 10000,
      });

      const models = response.data.data || [];
      const hasGPT4 = models.some((m: any) => m.id.includes('gpt-4'));

      this.logger.log(`OpenAI connection test successful. Models: ${models.length}`);

      return {
        success: true,
        message: `Connected to OpenAI (${models.length} models available${hasGPT4 ? ', GPT-4 access' : ''})`,
      };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message || 'Unknown error';
      this.logger.error(`OpenAI connection test failed: ${message}`);

      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid API key' };
      }
      if (error.response?.status === 429) {
        return { success: false, message: 'Rate limited. API key valid but quota exceeded.' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
