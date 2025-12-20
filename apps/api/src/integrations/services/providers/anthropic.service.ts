import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CredentialEncryptionService } from '../credential-encryption.service';
import { IntegrationProvider, IntegrationStatus, AnthropicCredentials } from '../../types/integration.types';
import Anthropic from '@anthropic-ai/sdk';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AnthropicMessageOptions {
  model?: string;
  maxTokens?: number;
  system?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  stopSequences?: string[];
}

export interface AnthropicMessageResult {
  id: string;
  content: string;
  model: string;
  stopReason: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private clientCache = new Map<string, Anthropic>();
  private credentialsCache = new Map<string, AnthropicCredentials>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: CredentialEncryptionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CLIENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get Anthropic client for a company (uses integration credentials)
   */
  async getClient(companyId: string): Promise<Anthropic | null> {
    // Check cache first
    const cached = this.clientCache.get(companyId);
    if (cached) {
      return cached;
    }

    try {
      const credentials = await this.getCredentials(companyId);
      if (!credentials?.apiKey) {
        this.logger.warn(`No valid Anthropic credentials for company ${companyId}`);
        return null;
      }

      // Create and cache client
      const client = new Anthropic({ apiKey: credentials.apiKey });
      this.clientCache.set(companyId, client);

      return client;
    } catch (error) {
      this.logger.error(`Error getting Anthropic client for company ${companyId}:`, error);
      return null;
    }
  }

  /**
   * Get Anthropic credentials for a company
   * Looks up clientId from the company, then finds the Anthropic integration
   */
  async getCredentials(companyId: string): Promise<AnthropicCredentials | null> {
    // Check cache first
    const cached = this.credentialsCache.get(companyId);
    if (cached) {
      return cached;
    }

    try {
      // Get the company to find its clientId
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { clientId: true },
      });

      if (!company?.clientId) {
        this.logger.warn(`Company ${companyId} not found or has no clientId`);
        return null;
      }

      // Find the Anthropic integration for this client
      const integration = await this.prisma.clientIntegration.findFirst({
        where: {
          clientId: company.clientId,
          provider: IntegrationProvider.ANTHROPIC,
          status: IntegrationStatus.ACTIVE,
        },
      });

      if (!integration?.credentials) {
        this.logger.warn(`No active Anthropic integration for client ${company.clientId}`);
        return null;
      }

      // Decrypt credentials
      const decrypted = this.encryptionService.decrypt(integration.credentials as any);
      const credentials = decrypted as AnthropicCredentials;

      // Cache credentials
      this.credentialsCache.set(companyId, credentials);

      return credentials;
    } catch (error) {
      this.logger.error(`Error getting Anthropic credentials:`, error);
      return null;
    }
  }

  /**
   * Clear cached client and credentials (call when credentials are updated)
   */
  clearCache(companyId: string): void {
    this.clientCache.delete(companyId);
    this.credentialsCache.delete(companyId);
  }

  // ═══════════════════════════════════════════════════════════════
  // MESSAGE GENERATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send a message and get a response from Claude
   */
  async sendMessage(
    companyId: string,
    options: AnthropicMessageOptions,
  ): Promise<AnthropicMessageResult | null> {
    const client = await this.getClient(companyId);
    if (!client) {
      this.logger.error(`Cannot send message: No Anthropic client for company ${companyId}`);
      return null;
    }

    const credentials = await this.getCredentials(companyId);
    const model = options.model || credentials?.defaultModel || 'claude-sonnet-4-20250514';
    const maxTokens = options.maxTokens || credentials?.maxTokens || 4096;

    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: options.system,
        messages: options.messages,
        temperature: options.temperature,
        stop_sequences: options.stopSequences,
      });

      // Extract text content from response
      const textContent = response.content.find((block) => block.type === 'text');
      const content = textContent && 'text' in textContent ? textContent.text : '';

      return {
        id: response.id,
        content,
        model: response.model,
        stopReason: response.stop_reason,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      this.logger.error(`Error sending message to Anthropic:`, error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CONNECTION TESTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Test connection using companyId
   */
  async testConnection(companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.getClient(companyId);
      if (!client) {
        return { success: false, error: 'No Anthropic credentials configured' };
      }

      const credentials = await this.getCredentials(companyId);
      const model = credentials?.defaultModel || 'claude-sonnet-4-20250514';

      // Send a minimal test message
      await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to connect to Anthropic' };
    }
  }

  /**
   * Test connection with direct credentials (for integration testing UI)
   */
  async testConnectionWithCredentials(
    credentials: AnthropicCredentials,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!credentials.apiKey) {
        return { success: false, message: 'API Key is required' };
      }

      const client = new Anthropic({ apiKey: credentials.apiKey });
      const model = credentials.defaultModel || 'claude-sonnet-4-20250514';

      // Send a minimal test message
      const response = await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      });

      return {
        success: true,
        message: `Connected to Anthropic successfully. Model: ${response.model}`,
      };
    } catch (error: any) {
      const message = error.message || 'Failed to connect to Anthropic';

      if (message.includes('authentication') || message.includes('api_key')) {
        return { success: false, message: 'Invalid API Key' };
      }
      if (message.includes('model')) {
        return { success: false, message: `Model error: ${message}` };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if Anthropic is configured for a company
   */
  async isConfigured(companyId: string): Promise<boolean> {
    const credentials = await this.getCredentials(companyId);
    return !!credentials?.apiKey;
  }

  /**
   * Get the default model for a company
   */
  async getDefaultModel(companyId: string): Promise<string> {
    const credentials = await this.getCredentials(companyId);
    return credentials?.defaultModel || 'claude-sonnet-4-20250514';
  }

  /**
   * Get the max tokens setting for a company
   */
  async getMaxTokens(companyId: string): Promise<number> {
    const credentials = await this.getCredentials(companyId);
    return credentials?.maxTokens || 4096;
  }
}
