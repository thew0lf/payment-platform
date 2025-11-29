import { Injectable, Logger } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

export interface BedrockCredentials {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  modelId?: string;
}

export interface BedrockSettings {
  defaultMaxTokens?: number;
  defaultTemperature?: number;
}

export interface ContentGenerationRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  modelId?: string;
}

export interface ContentGenerationResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: string;
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

@Injectable()
export class BedrockService {
  private readonly logger = new Logger(BedrockService.name);
  private clientCache = new Map<string, BedrockRuntimeClient>();

  /**
   * Get or create a Bedrock client for the given credentials
   */
  private getClient(credentials: BedrockCredentials): BedrockRuntimeClient {
    const cacheKey = `${credentials.region}:${credentials.accessKeyId}`;

    if (!this.clientCache.has(cacheKey)) {
      const client = new BedrockRuntimeClient({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });
      this.clientCache.set(cacheKey, client);
    }

    return this.clientCache.get(cacheKey)!;
  }

  /**
   * Generate content using Claude via Bedrock
   */
  async generateContent(
    credentials: BedrockCredentials,
    request: ContentGenerationRequest,
    settings?: BedrockSettings,
  ): Promise<ContentGenerationResponse> {
    const client = this.getClient(credentials);
    const modelId = request.modelId || credentials.modelId || 'anthropic.claude-3-sonnet-20240229-v1:0';

    const maxTokens = request.maxTokens || settings?.defaultMaxTokens || 1024;
    const temperature = request.temperature ?? settings?.defaultTemperature ?? 0.7;

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: request.prompt,
        },
      ],
      ...(request.systemPrompt && { system: request.systemPrompt }),
    };

    try {
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return {
        content: responseBody.content[0].text,
        usage: {
          inputTokens: responseBody.usage.input_tokens,
          outputTokens: responseBody.usage.output_tokens,
        },
        stopReason: responseBody.stop_reason,
      };
    } catch (error: any) {
      this.logger.error(`Bedrock API error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate a product description with SEO optimization
   */
  async generateProductDescription(
    credentials: BedrockCredentials,
    request: ProductDescriptionRequest,
    settings?: BedrockSettings,
  ): Promise<ProductDescriptionResponse> {
    const lengthGuidance: Record<string, string> = {
      short: '2-3 sentences (50-75 words)',
      medium: '1-2 paragraphs (100-150 words)',
      long: '2-3 paragraphs (200-300 words)',
    };

    const systemPrompt = `You are an expert e-commerce copywriter. Generate compelling product descriptions that drive conversions while being accurate and honest. Never make unverifiable claims. Focus on benefits over features.`;

    const prompt = `Generate a product description for an e-commerce store.

Product Information:
- Name: ${request.productName}
${request.category ? `- Category: ${request.category}` : ''}
${request.attributes ? `- Attributes: ${JSON.stringify(request.attributes, null, 2)}` : ''}

Requirements:
- Tone: ${request.tone || 'professional'}
- Length: ${lengthGuidance[request.length || 'medium']}
${request.targetAudience ? `- Target Audience: ${request.targetAudience}` : ''}
${request.includeSEO ? '- Include SEO-friendly keywords naturally' : ''}

IMPORTANT:
- Do NOT include pricing information
- Do NOT make claims that cannot be verified
- Focus on benefits and unique selling points
- Use active voice and engaging language

Respond with valid JSON only (no markdown):
{
  "description": "The product description text",
  "metaTitle": "SEO title (max 60 characters)",
  "metaDescription": "SEO description (max 160 characters)",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`;

    const response = await this.generateContent(credentials, {
      prompt,
      systemPrompt,
      maxTokens: 1000,
      temperature: 0.7,
    }, settings);

    try {
      // Clean response and parse JSON
      let cleanContent = response.content.trim();
      // Remove markdown code blocks if present
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const parsed = JSON.parse(cleanContent);
      return {
        description: parsed.description,
        metaTitle: parsed.metaTitle,
        metaDescription: parsed.metaDescription,
        suggestedTags: parsed.suggestedTags,
      };
    } catch {
      this.logger.warn('Failed to parse structured response, returning raw content');
      return {
        description: response.content,
      };
    }
  }

  /**
   * Generate alt text for a product image
   */
  async generateAltText(
    credentials: BedrockCredentials,
    productName: string,
    imageDescription?: string,
    settings?: BedrockSettings,
  ): Promise<string> {
    const prompt = `Generate concise, descriptive alt text for a product image.

Product: ${productName}
${imageDescription ? `Image shows: ${imageDescription}` : ''}

Requirements:
- Max 125 characters
- Describe what's visible in the image
- Include the product name
- Be specific but concise
- Do not start with "Image of" or "Photo of"

Respond with only the alt text, no quotes or explanation.`;

    const response = await this.generateContent(credentials, {
      prompt,
      maxTokens: 100,
      temperature: 0.3,
    }, settings);

    return response.content.trim().substring(0, 125);
  }

  /**
   * Suggest categories and tags for a product
   */
  async suggestCategorization(
    credentials: BedrockCredentials,
    productName: string,
    description: string,
    existingCategories?: string[],
    existingTags?: string[],
    settings?: BedrockSettings,
  ): Promise<{ category: string; subcategory?: string; tags: string[] }> {
    const prompt = `Analyze this product and suggest appropriate categorization.

Product: ${productName}
Description: ${description}

${existingCategories?.length ? `Available categories: ${existingCategories.join(', ')}` : ''}
${existingTags?.length ? `Existing tags: ${existingTags.join(', ')}` : ''}

Respond with valid JSON only:
{
  "category": "Main category name",
  "subcategory": "Subcategory if applicable",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

    const response = await this.generateContent(credentials, {
      prompt,
      maxTokens: 200,
      temperature: 0.3,
    }, settings);

    try {
      let cleanContent = response.content.trim();
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      return JSON.parse(cleanContent);
    } catch {
      return {
        category: 'Uncategorized',
        tags: [],
      };
    }
  }

  /**
   * Test connection to Bedrock
   */
  async testConnection(credentials: BedrockCredentials): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
  }> {
    const startTime = Date.now();

    try {
      await this.generateContent(credentials, {
        prompt: 'Respond with only the word "connected"',
        maxTokens: 10,
        temperature: 0,
      });

      return {
        success: true,
        message: 'Successfully connected to AWS Bedrock',
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
