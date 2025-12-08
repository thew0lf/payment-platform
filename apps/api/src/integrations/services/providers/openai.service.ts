import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface OpenAICredentials {
  apiKey: string;
  organizationId?: string;
  defaultModel?: string;
}

export interface OpenAISettings {
  defaultMaxTokens?: number;
  defaultTemperature?: number;
}

export interface OpenAITestResult {
  success: boolean;
  message: string;
  models?: string[];
  hasGPT4?: boolean;
}

export interface ContentGenerationRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface ContentGenerationResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  model: string;
}

export interface ProductDescriptionRequest {
  productName: string;
  category?: string;
  attributes?: Record<string, unknown>;
  tone?: 'professional' | 'casual' | 'luxury' | 'technical';
  length?: 'short' | 'medium' | 'long';
  targetAudience?: string;
  includeSEO?: boolean;
}

export interface ProductDescriptionResponse {
  description: string;
  metaTitle?: string;
  metaDescription?: string;
  suggestedTags?: string[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  model: string;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly baseUrl = 'https://api.openai.com/v1';

  /**
   * Build headers for OpenAI API requests
   */
  private getHeaders(credentials: OpenAICredentials): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (credentials.organizationId) {
      headers['OpenAI-Organization'] = credentials.organizationId;
    }

    return headers;
  }

  /**
   * Get the default model to use
   */
  private getModel(credentials: OpenAICredentials, requestModel?: string): string {
    return requestModel || credentials.defaultModel || 'gpt-4-turbo-preview';
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(credentials: OpenAICredentials): Promise<OpenAITestResult> {
    try {
      if (!credentials.apiKey) {
        return { success: false, message: 'API Key is required' };
      }

      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: this.getHeaders(credentials),
        timeout: 10000,
      });

      const models = response.data.data || [];
      const modelIds = models.map((m: any) => m.id);
      const hasGPT4 = modelIds.some((id: string) => id.includes('gpt-4'));
      const hasGPT4Turbo = modelIds.some((id: string) => id.includes('gpt-4-turbo'));

      this.logger.log(`OpenAI connection test successful. Models: ${models.length}`);

      return {
        success: true,
        message: `Connected to OpenAI (${models.length} models available${hasGPT4Turbo ? ', GPT-4 Turbo access' : hasGPT4 ? ', GPT-4 access' : ''})`,
        models: modelIds.slice(0, 10), // Return first 10 models
        hasGPT4,
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

  /**
   * Generate content using OpenAI chat completions
   */
  async generateContent(
    credentials: OpenAICredentials,
    request: ContentGenerationRequest,
    settings?: OpenAISettings,
  ): Promise<ContentGenerationResponse> {
    const model = this.getModel(credentials, request.model);
    const maxTokens = request.maxTokens || settings?.defaultMaxTokens || 1024;
    const temperature = request.temperature ?? settings?.defaultTemperature ?? 0.7;

    const messages: ChatMessage[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    messages.push({ role: 'user', content: request.prompt });

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        },
        {
          headers: this.getHeaders(credentials),
          timeout: 60000,
        },
      );

      const choice = response.data.choices[0];
      const usage = response.data.usage;

      this.logger.log(`OpenAI content generated: ${usage.total_tokens} tokens`);

      return {
        content: choice.message.content,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        finishReason: choice.finish_reason,
        model: response.data.model,
      };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message;
      this.logger.error(`OpenAI content generation failed: ${message}`);
      throw new Error(`OpenAI content generation failed: ${message}`);
    }
  }

  /**
   * Chat completion with full message history
   */
  async chatCompletion(
    credentials: OpenAICredentials,
    request: ChatCompletionRequest,
    settings?: OpenAISettings,
  ): Promise<ContentGenerationResponse> {
    const model = this.getModel(credentials, request.model);
    const maxTokens = request.maxTokens || settings?.defaultMaxTokens || 1024;
    const temperature = request.temperature ?? settings?.defaultTemperature ?? 0.7;

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages: request.messages,
          max_tokens: maxTokens,
          temperature,
        },
        {
          headers: this.getHeaders(credentials),
          timeout: 60000,
        },
      );

      const choice = response.data.choices[0];
      const usage = response.data.usage;

      return {
        content: choice.message.content,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        finishReason: choice.finish_reason,
        model: response.data.model,
      };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message;
      this.logger.error(`OpenAI chat completion failed: ${message}`);
      throw new Error(`OpenAI chat completion failed: ${message}`);
    }
  }

  /**
   * Generate product description with SEO metadata
   */
  async generateProductDescription(
    credentials: OpenAICredentials,
    request: ProductDescriptionRequest,
    settings?: OpenAISettings,
  ): Promise<ProductDescriptionResponse> {
    const lengthGuide = {
      short: '50-100 words',
      medium: '150-250 words',
      long: '300-500 words',
    };

    const toneGuide = {
      professional: 'professional and authoritative',
      casual: 'friendly and conversational',
      luxury: 'elegant and sophisticated',
      technical: 'detailed and specification-focused',
    };

    const systemPrompt = `You are an expert e-commerce copywriter. Generate compelling product descriptions that drive conversions.
Always respond in valid JSON format with the following structure:
{
  "description": "the product description",
  "metaTitle": "SEO meta title (50-60 chars)",
  "metaDescription": "SEO meta description (150-160 chars)",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`;

    const prompt = `Generate a product description for:

Product Name: ${request.productName}
${request.category ? `Category: ${request.category}` : ''}
${request.attributes ? `Attributes: ${JSON.stringify(request.attributes)}` : ''}
${request.targetAudience ? `Target Audience: ${request.targetAudience}` : ''}

Requirements:
- Tone: ${toneGuide[request.tone || 'professional']}
- Length: ${lengthGuide[request.length || 'medium']}
${request.includeSEO ? '- Include SEO metadata (meta title, meta description, tags)' : ''}

Respond ONLY with valid JSON.`;

    const response = await this.generateContent(
      credentials,
      {
        prompt,
        systemPrompt,
        maxTokens: 1000,
        temperature: 0.7,
      },
      settings,
    );

    try {
      // Parse the JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        description: parsed.description || response.content,
        metaTitle: parsed.metaTitle,
        metaDescription: parsed.metaDescription,
        suggestedTags: parsed.suggestedTags,
      };
    } catch {
      // If JSON parsing fails, return the raw content
      this.logger.warn('Failed to parse product description JSON, returning raw content');
      return {
        description: response.content,
      };
    }
  }

  /**
   * Generate image alt text for accessibility
   */
  async generateAltText(
    credentials: OpenAICredentials,
    imageDescription: string,
    productContext?: string,
  ): Promise<string> {
    const prompt = `Generate a concise, descriptive alt text for an image.
${productContext ? `Product context: ${productContext}` : ''}

Image shows: ${imageDescription}

Requirements:
- 125 characters or less
- Descriptive but concise
- Good for accessibility and SEO
- No phrases like "image of" or "picture of"

Respond with ONLY the alt text, no quotes or extra formatting.`;

    const response = await this.generateContent(credentials, {
      prompt,
      maxTokens: 50,
      temperature: 0.3,
    });

    return response.content.trim().replace(/^["']|["']$/g, '');
  }

  /**
   * Suggest product categorization
   */
  async suggestCategorization(
    credentials: OpenAICredentials,
    productName: string,
    productDescription: string,
    existingCategories?: string[],
  ): Promise<{ category: string; subcategory?: string; confidence: number }> {
    const systemPrompt = `You are a product categorization expert. Analyze products and suggest the best category.
Respond ONLY in valid JSON format:
{
  "category": "main category",
  "subcategory": "subcategory if applicable",
  "confidence": 0.95
}`;

    const prompt = `Categorize this product:

Name: ${productName}
Description: ${productDescription}
${existingCategories?.length ? `Available categories: ${existingCategories.join(', ')}` : 'Suggest appropriate categories'}

Respond with JSON only.`;

    const response = await this.generateContent(credentials, {
      prompt,
      systemPrompt,
      maxTokens: 150,
      temperature: 0.3,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      return JSON.parse(jsonMatch[0]);
    } catch {
      return { category: 'Uncategorized', confidence: 0 };
    }
  }

  /**
   * Generate embeddings for semantic search
   */
  async generateEmbeddings(
    credentials: OpenAICredentials,
    request: EmbeddingRequest,
  ): Promise<EmbeddingResponse> {
    const model = request.model || 'text-embedding-3-small';

    try {
      const response = await axios.post(
        `${this.baseUrl}/embeddings`,
        {
          model,
          input: request.input,
        },
        {
          headers: this.getHeaders(credentials),
          timeout: 30000,
        },
      );

      const embeddings = response.data.data.map((d: any) => d.embedding);

      return {
        embeddings,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
        model: response.data.model,
      };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message;
      this.logger.error(`OpenAI embeddings failed: ${message}`);
      throw new Error(`OpenAI embeddings failed: ${message}`);
    }
  }

  /**
   * Moderate content for policy violations
   */
  async moderateContent(
    credentials: OpenAICredentials,
    content: string,
  ): Promise<{ flagged: boolean; categories: Record<string, boolean>; scores: Record<string, number> }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/moderations`,
        { input: content },
        {
          headers: this.getHeaders(credentials),
          timeout: 10000,
        },
      );

      const result = response.data.results[0];

      return {
        flagged: result.flagged,
        categories: result.categories,
        scores: result.category_scores,
      };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message;
      this.logger.error(`OpenAI moderation failed: ${message}`);
      throw new Error(`OpenAI moderation failed: ${message}`);
    }
  }
}
