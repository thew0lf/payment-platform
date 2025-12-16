import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import {
  ContentType,
  ContentPurpose,
  ContentStatus,
  AIProvider,
  GeneratedContent,
  ContentTemplate,
  ContentVariation,
  CustomerContentContext,
  ContentGenerationConfig,
  GenerateContentDto,
  RenderTemplateDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  ImproveContentDto,
  AnalyzeContentDto,
  GetTemplatesDto,
  GetGeneratedContentDto,
  ContentAnalytics,
  ContentAnalyticsDto,
  ContentGeneratedEvent,
  TemplateVariable,
} from '../types/content.types';
import { TriggerLibraryService } from '../behavioral-triggers/trigger-library.service';
import { BehavioralTriggerType } from '../types/triggers.types';

@Injectable()
export class ContentGenerationService {
  private readonly logger = new Logger(ContentGenerationService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly triggerService: TriggerLibraryService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get('ANTHROPIC_API_KEY'),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CONTENT GENERATION
  // ═══════════════════════════════════════════════════════════════

  async generateContent(dto: GenerateContentDto): Promise<GeneratedContent> {
    this.logger.log(`Generating ${dto.type} content for ${dto.purpose}`);
    const startTime = Date.now();

    const genConfig = await this.getGenerationConfig(dto.companyId);
    const provider = dto.provider || this.selectProvider(dto, genConfig);

    let customerContext: CustomerContentContext | undefined;
    if (dto.customerId) {
      customerContext = await this.buildCustomerContext(dto.customerId);
    } else if (dto.customerContext) {
      customerContext = dto.customerContext as CustomerContentContext;
    }

    const { systemPrompt, userPrompt } = this.buildPrompts(dto, genConfig, customerContext);

    let rawContent: string;
    let tokensUsed = 0;

    if (provider === AIProvider.CLAUDE) {
      const result = await this.generateWithClaude(systemPrompt, userPrompt, genConfig);
      rawContent = result.content;
      tokensUsed = result.tokens;
    } else {
      const result = await this.generateWithOllama(systemPrompt, userPrompt, genConfig);
      rawContent = result.content;
      tokensUsed = result.tokens;
    }

    const parsedContent = this.parseGeneratedContent(rawContent, dto.type);

    let triggersApplied: string[] = [];
    let enhancedBody = parsedContent.body;

    if (dto.applyTriggers !== false) {
      const triggerResult = await this.triggerService.applyTriggers({
        content: parsedContent.body,
        context: this.mapPurposeToContext(dto.purpose),
        customerData: customerContext
          ? {
              tenureMonths: customerContext.tenureMonths,
              lifetimeValue: customerContext.lifetimeValue,
              engagementScore: customerContext.engagementScore,
              productsExplored: customerContext.productsExplored,
              rewardsBalance: customerContext.rewardsBalance,
            }
          : undefined,
        triggers: dto.specificTriggers?.map((t) => t as BehavioralTriggerType),
        maxTriggers: genConfig.triggers.maxTriggersPerContent,
      });

      enhancedBody = triggerResult.enhanced;
      triggersApplied = triggerResult.triggersApplied.map((t) => t.triggerType);
    }

    let variations: ContentVariation[] | undefined;
    if (dto.variations && dto.variations > 1) {
      variations = await this.generateVariations(dto, genConfig, customerContext, dto.variations);
    }

    const qualityScore = this.calculateQualityScore(enhancedBody, dto.type);
    const readabilityScore = this.calculateReadabilityScore(enhancedBody);

    const status =
      genConfig.quality.autoApprove && qualityScore >= genConfig.quality.autoApproveMinScore
        ? ContentStatus.APPROVED
        : ContentStatus.GENERATED;

    const generatedContent: GeneratedContent = {
      id: this.generateContentId(),
      companyId: dto.companyId,
      templateId: dto.templateId,
      type: dto.type,
      purpose: dto.purpose,
      provider,
      prompt: userPrompt,
      systemPrompt,
      subject: parsedContent.subject,
      body: enhancedBody,
      bodyHtml: this.convertToHtml(enhancedBody, dto.type),
      variations,
      customerId: dto.customerId,
      customerContext,
      triggersApplied,
      qualityScore,
      readabilityScore,
      tokensUsed,
      generationTimeMs: Date.now() - startTime,
      cost: this.calculateCost(provider, tokensUsed),
      status,
      createdAt: new Date(),
    };

    const event: ContentGeneratedEvent = {
      content: generatedContent,
      provider,
      tokensUsed,
      cost: generatedContent.cost,
    };
    this.eventEmitter.emit('content.generated', event);

    return generatedContent;
  }

  // ═══════════════════════════════════════════════════════════════
  // TEMPLATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async createTemplate(dto: CreateTemplateDto): Promise<ContentTemplate> {
    this.logger.log(`Creating template: ${dto.name}`);

    const template: ContentTemplate = {
      id: this.generateTemplateId(),
      companyId: dto.companyId,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      purpose: dto.purpose,
      status: ContentStatus.DRAFT,
      subject: dto.subject,
      preheader: dto.preheader,
      body: dto.body,
      bodyHtml: dto.bodyHtml || this.convertToHtml(dto.body, dto.type),
      variables: dto.variables || [],
      aiGenerated: false,
      triggersApplied: dto.triggersApplied || [],
      personalizationLevel: 'basic',
      usageCount: 0,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    };

    return template;
  }

  async updateTemplate(dto: UpdateTemplateDto): Promise<ContentTemplate> {
    this.logger.log(`Updating template: ${dto.templateId}`);

    const template = await this.getTemplate(dto.templateId);
    if (!template) {
      throw new NotFoundException(`Template ${dto.templateId} not found`);
    }

    return {
      ...template,
      name: dto.name || template.name,
      description: dto.description ?? template.description,
      subject: dto.subject ?? template.subject,
      preheader: dto.preheader ?? template.preheader,
      body: dto.body || template.body,
      bodyHtml: dto.bodyHtml ?? template.bodyHtml,
      variables: dto.variables || template.variables,
      triggersApplied: dto.triggersApplied || template.triggersApplied,
      status: dto.status || template.status,
      updatedAt: new Date(),
      version: template.version + 1,
    };
  }

  async getTemplate(templateId: string): Promise<ContentTemplate | null> {
    return null;
  }

  async getTemplates(dto: GetTemplatesDto): Promise<{ templates: ContentTemplate[]; total: number }> {
    return { templates: [], total: 0 };
  }

  async renderTemplate(dto: RenderTemplateDto): Promise<{ subject?: string; body: string; bodyHtml?: string }> {
    const template = await this.getTemplate(dto.templateId);

    if (!template) {
      throw new NotFoundException(`Template ${dto.templateId} not found`);
    }

    let variables = { ...dto.variables };
    if (dto.customerId) {
      const customerContext = await this.buildCustomerContext(dto.customerId);
      variables = {
        ...variables,
        customer_name: customerContext.firstName,
        customer_email: customerContext.email,
        plan_name: customerContext.planName,
        rewards_balance: customerContext.rewardsBalance?.toString(),
      };
    }

    let body = this.replaceVariables(template.body, variables, template.variables);
    const subject = template.subject
      ? this.replaceVariables(template.subject, variables, template.variables)
      : undefined;

    if (dto.applyTriggers) {
      const triggerResult = await this.triggerService.applyTriggers({
        content: body,
        context: this.mapPurposeToContext(template.purpose),
        customerData: dto.customerId ? await this.buildCustomerContext(dto.customerId) : undefined,
      });
      body = triggerResult.enhanced;
    }

    return { subject, body, bodyHtml: this.convertToHtml(body, template.type) };
  }

  async generateTemplateFromAI(dto: {
    companyId: string;
    name: string;
    type: ContentType;
    purpose: ContentPurpose;
    instructions: string;
    tone?: string;
  }): Promise<ContentTemplate> {
    const generated = await this.generateContent({
      companyId: dto.companyId,
      type: dto.type,
      purpose: dto.purpose,
      instructions: dto.instructions,
      tone: dto.tone,
      applyTriggers: true,
      qualityLevel: 'high',
    });

    return this.createTemplate({
      companyId: dto.companyId,
      name: dto.name,
      description: `AI-generated template: ${dto.instructions}`,
      type: dto.type,
      purpose: dto.purpose,
      subject: generated.subject,
      body: generated.body,
      bodyHtml: generated.bodyHtml,
      triggersApplied: generated.triggersApplied,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CONTENT IMPROVEMENT
  // ═══════════════════════════════════════════════════════════════

  async improveContent(dto: ImproveContentDto): Promise<GeneratedContent> {
    const original = await this.getGeneratedContent(dto.contentId);
    if (!original) {
      throw new NotFoundException(`Content ${dto.contentId} not found`);
    }

    const aspects = dto.aspects || ['clarity', 'persuasion'];
    const aspectInstructions: Record<string, string> = {
      clarity: 'Make the message clearer and easier to understand.',
      persuasion: 'Make the message more compelling and action-oriented.',
      tone: 'Adjust the tone to be more appropriate for the audience.',
      length: 'Optimize the length - remove unnecessary words while keeping key points.',
      triggers: 'Apply more behavioral psychology triggers effectively.',
    };

    const improvementPrompt = `Improve the following ${original.type} content based on this feedback:
${dto.feedback}

Focus on these aspects:
${aspects.map((a) => `- ${aspectInstructions[a]}`).join('\n')}

Original content:
${original.body}

Provide the improved version:`;

    return this.generateContent({
      companyId: original.companyId,
      type: original.type,
      purpose: original.purpose,
      prompt: improvementPrompt,
      customerId: original.customerId,
      applyTriggers: true,
      qualityLevel: 'high',
    });
  }

  async analyzeContent(dto: AnalyzeContentDto): Promise<{
    qualityScore: number;
    readabilityScore: number;
    sentimentScore: number;
    triggersDetected: string[];
    suggestions: string[];
    wordCount: number;
    estimatedReadTime: number;
  }> {
    const qualityScore = this.calculateQualityScore(dto.content, dto.type);
    const readabilityScore = this.calculateReadabilityScore(dto.content);
    const sentimentScore = this.analyzeSentiment(dto.content);
    const triggersDetected = this.detectTriggers(dto.content);
    const wordCount = dto.content.split(/\s+/).length;

    return {
      qualityScore,
      readabilityScore,
      sentimentScore,
      triggersDetected,
      suggestions: this.generateSuggestions(dto.content, dto.type, dto.purpose),
      wordCount,
      estimatedReadTime: Math.ceil(wordCount / 200),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getGeneratedContent(contentId: string): Promise<GeneratedContent | null> {
    return null;
  }

  async getGeneratedContents(dto: GetGeneratedContentDto): Promise<{ contents: GeneratedContent[]; total: number }> {
    return { contents: [], total: 0 };
  }

  async getAnalytics(dto: ContentAnalyticsDto): Promise<ContentAnalytics> {
    return {
      period: { start: new Date(dto.startDate), end: new Date(dto.endDate) },
      overview: { totalGenerated: 0, totalTokensUsed: 0, totalCost: 0, avgQualityScore: 0, avgGenerationTime: 0 },
      byType: {} as any,
      byPurpose: {} as any,
      byProvider: {} as any,
      topTemplates: [],
      triggersPerformance: [],
    };
  }

  // Methods for backwards compatibility with momentum-intelligence.controller
  async getContent(companyId: string, options: { type?: ContentType; status?: ContentStatus; limit?: number }) {
    return this.getGeneratedContents({ companyId, type: options.type, status: options.status, limit: options.limit });
  }

  async getContentById(contentId: string): Promise<GeneratedContent | null> {
    return this.getGeneratedContent(contentId);
  }

  async approveContent(contentId: string, approvedBy: string): Promise<GeneratedContent | null> {
    const content = await this.getGeneratedContent(contentId);
    if (!content) return null;
    return { ...content, status: ContentStatus.APPROVED, reviewedBy: approvedBy, reviewedAt: new Date() };
  }

  async generateVariant(contentId: string, modifications?: any): Promise<GeneratedContent | null> {
    const original = await this.getGeneratedContent(contentId);
    if (!original) return null;
    return this.generateContent({
      companyId: original.companyId,
      type: original.type,
      purpose: original.purpose,
      prompt: modifications?.prompt || original.prompt,
      tone: modifications?.tone,
      customerId: original.customerId,
      applyTriggers: true,
    });
  }

  getAllTriggers() {
    return this.triggerService.getAllTriggers();
  }

  getTriggersByCategory(category: string) {
    return this.triggerService.getTriggersByContext(category);
  }

  // ═══════════════════════════════════════════════════════════════
  // AI GENERATION METHODS
  // ═══════════════════════════════════════════════════════════════

  private async generateWithClaude(
    systemPrompt: string,
    userPrompt: string,
    config: ContentGenerationConfig,
  ): Promise<{ content: string; tokens: number }> {
    try {
      const response = await this.anthropic.messages.create({
        model: config.claude.model || 'claude-sonnet-4-20250514',
        max_tokens: config.claude.maxTokens || 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      return { content, tokens: response.usage.input_tokens + response.usage.output_tokens };
    } catch (error) {
      this.logger.error(`Claude generation failed: ${error}`);
      throw new BadRequestException('Content generation failed');
    }
  }

  private async generateWithOllama(
    systemPrompt: string,
    userPrompt: string,
    config: ContentGenerationConfig,
  ): Promise<{ content: string; tokens: number }> {
    const endpoint = config.ollama.endpoint || 'http://localhost:11434';

    try {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.ollama.model || 'llama3.1:8b',
          prompt: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
          stream: false,
          options: { temperature: config.ollama.temperature || 0.7, num_predict: config.ollama.maxTokens || 1024 },
        }),
      });

      const data = await response.json();
      return { content: data.response, tokens: data.eval_count || 0 };
    } catch (error) {
      this.logger.error(`Ollama generation failed: ${error}`);
      return this.generateWithClaude(systemPrompt, userPrompt, config);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PROMPT BUILDING
  // ═══════════════════════════════════════════════════════════════

  private buildPrompts(
    dto: GenerateContentDto,
    config: ContentGenerationConfig,
    customerContext?: CustomerContentContext,
  ): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = this.buildSystemPrompt(dto, config);
    const userPrompt = this.buildUserPrompt(dto, customerContext);
    return { systemPrompt, userPrompt };
  }

  private buildSystemPrompt(dto: GenerateContentDto, config: ContentGenerationConfig): string {
    const contentTypeGuidelines = this.getContentTypeGuidelines(dto.type);
    const purposeGuidelines = this.getPurposeGuidelines(dto.purpose);

    return `You are an expert marketing copywriter specializing in subscription businesses.

## Brand Voice
- Tone: ${config.brandVoice.tone.join(', ')}
- Personality: ${config.brandVoice.personality}
- Avoid these words: ${config.brandVoice.avoidWords.join(', ')}
- Preferred phrases: ${config.brandVoice.preferredPhrases.join(', ')}
${config.brandVoice.styleGuide ? `\n## Style Guide\n${config.brandVoice.styleGuide}` : ''}

## Content Type: ${dto.type}
${contentTypeGuidelines}

## Purpose: ${dto.purpose}
${purposeGuidelines}

## Output Format
For emails, structure your response as:
SUBJECT: [subject line]
PREHEADER: [preheader text]
BODY:
[email body]

For SMS, keep under 160 characters.
For voice scripts, include natural pauses and emphasis markers.

## Behavioral Psychology
Apply these principles naturally:
- Pattern interrupts to capture attention
- Loss aversion to emphasize what they might lose
- Social proof where appropriate
- Urgency without being pushy
- Identity alignment to connect with their self-image`;
  }

  private buildUserPrompt(dto: GenerateContentDto, customerContext?: CustomerContentContext): string {
    let prompt = dto.prompt || dto.instructions || `Generate ${dto.type} content for ${dto.purpose}`;

    if (customerContext) {
      prompt += `\n\n## Customer Context
- Name: ${customerContext.firstName}
- Account age: ${customerContext.tenureMonths} months
- Lifetime value: ${customerContext.lifetimeValue}
- Current plan: ${customerContext.planName} ($${customerContext.planPrice}/month)
- Engagement score: ${customerContext.engagementScore}/100
- Rewards balance: ${customerContext.rewardsBalance || 0}`;
      if (customerContext.cancelReason) prompt += `\n- Cancel reason: ${customerContext.cancelReason}`;
      if (customerContext.churnRiskScore) prompt += `\n- Churn risk: ${customerContext.churnRiskScore}/100`;
    }

    if (dto.tone) prompt += `\n\nTone: ${dto.tone}`;

    if (dto.length) {
      const lengthGuide: Record<string, string> = {
        short: 'Keep it concise - under 100 words',
        medium: 'Moderate length - 100-250 words',
        long: 'Comprehensive - 250-500 words',
      };
      prompt += `\n\nLength: ${lengthGuide[dto.length]}`;
    }

    return prompt;
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private selectProvider(dto: GenerateContentDto, config: ContentGenerationConfig): AIProvider {
    for (const rule of config.providers.routingRules.sort((a, b) => a.priority - b.priority)) {
      const { conditions } = rule;
      if (conditions.contentType && !conditions.contentType.includes(dto.type)) continue;
      if (conditions.purpose && !conditions.purpose.includes(dto.purpose)) continue;
      if (conditions.qualityRequired === 'high' && dto.qualityLevel !== 'high') continue;
      if (conditions.personalized && !dto.customerId) continue;
      return rule.provider;
    }
    return config.providers.primary;
  }

  private async buildCustomerContext(customerId: string): Promise<CustomerContentContext> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          subscriptions: { where: { status: 'ACTIVE' }, take: 1 },
          orders: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      });

      if (!customer) return { customerId };

      const subscription = customer.subscriptions[0];
      const tenureMonths = Math.floor((Date.now() - customer.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000));
      const lifetimeValue = customer.orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      return {
        customerId,
        firstName: customer.firstName || undefined,
        lastName: customer.lastName || undefined,
        email: customer.email,
        tenureMonths,
        lifetimeValue,
        planName: subscription?.planName || undefined,
        planPrice: subscription ? Number(subscription.planAmount) : undefined,
        nextBillingDate: subscription?.nextBillingDate || undefined,
        recentOrders: customer.orders.length,
      };
    } catch (error) {
      this.logger.warn(`Failed to build customer context: ${error}`);
      return { customerId };
    }
  }

  private parseGeneratedContent(raw: string, type: ContentType): { subject?: string; preheader?: string; body: string } {
    if (type === ContentType.EMAIL) {
      const subjectMatch = raw.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
      const preheaderMatch = raw.match(/PREHEADER:\s*(.+?)(?:\n|$)/i);
      const bodyMatch = raw.match(/BODY:\s*([\s\S]+)/i);
      return {
        subject: subjectMatch?.[1]?.trim(),
        preheader: preheaderMatch?.[1]?.trim(),
        body: bodyMatch?.[1]?.trim() || raw,
      };
    }
    return { body: raw.trim() };
  }

  private async generateVariations(
    dto: GenerateContentDto,
    config: ContentGenerationConfig,
    customerContext: CustomerContentContext | undefined,
    count: number,
  ): Promise<ContentVariation[]> {
    const variations: ContentVariation[] = [];
    const tones = ['professional', 'friendly', 'urgent', 'empathetic'];

    for (let i = 0; i < count; i++) {
      const tone = tones[i % tones.length];
      const { systemPrompt, userPrompt } = this.buildPrompts({ ...dto, tone }, config, customerContext);
      const result = await this.generateWithClaude(systemPrompt, userPrompt, config);
      const parsed = this.parseGeneratedContent(result.content, dto.type);

      variations.push({
        id: `var_${i + 1}`,
        version: String.fromCharCode(65 + i),
        subject: parsed.subject,
        body: parsed.body,
        triggers: [],
        tone,
        selected: i === 0,
      });
    }
    return variations;
  }

  private replaceVariables(template: string, values: Record<string, unknown>, variableConfigs: TemplateVariable[]): string {
    let result = template;
    const fallbacks = new Map(variableConfigs.map((v) => [v.name, v.fallback]));
    result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = values[varName];
      if (value !== undefined && value !== null) return String(value);
      return fallbacks.get(varName) || match;
    });
    return result;
  }

  private convertToHtml(text: string, type: ContentType): string {
    if (type === ContentType.SMS || type === ContentType.PUSH_NOTIFICATION) return text;
    const html = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
  }

  private calculateQualityScore(content: string, type: ContentType): number {
    let score = 70;
    const wordCount = content.split(/\s+/).length;
    const idealLength: Record<string, { min: number; max: number }> = {
      [ContentType.EMAIL]: { min: 50, max: 300 },
      [ContentType.SMS]: { min: 10, max: 30 },
      [ContentType.VOICE_SCRIPT]: { min: 100, max: 500 },
    };
    const ideal = idealLength[type] || { min: 50, max: 300 };
    if (wordCount >= ideal.min && wordCount <= ideal.max) score += 10;
    if (/click|call|visit|sign up|subscribe|reply|respond/i.test(content)) score += 10;
    if (content.includes('{{') || /\byou\b|\byour\b/i.test(content)) score += 5;
    if (/\?/.test(content)) score += 2;
    if (/!/.test(content)) score += 2;
    return Math.min(100, score);
  }

  private calculateReadabilityScore(content: string): number {
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / Math.max(sentences, 1);
    if (avgWordsPerSentence <= 15) return 90;
    if (avgWordsPerSentence <= 20) return 75;
    if (avgWordsPerSentence <= 25) return 60;
    return 45;
  }

  private analyzeSentiment(content: string): number {
    const positive = ['great', 'amazing', 'love', 'best', 'wonderful', 'excited', 'happy'];
    const negative = ['sorry', 'unfortunately', 'problem', 'issue', 'bad', 'sad'];
    let score = 0;
    const lower = content.toLowerCase();
    for (const word of positive) if (lower.includes(word)) score += 0.1;
    for (const word of negative) if (lower.includes(word)) score -= 0.1;
    return Math.max(-1, Math.min(1, score));
  }

  private detectTriggers(content: string): string[] {
    const detected: string[] = [];
    const lower = content.toLowerCase();
    if (/you'll lose|don't miss|expires/i.test(lower)) detected.push('LOSS_AVERSION');
    if (/\d+% of|thousands of|join \d+/i.test(lower)) detected.push('SOCIAL_PROOF');
    if (/only \d+ left|limited|exclusive/i.test(lower)) detected.push('SCARCITY');
    if (/today only|ends soon|last chance/i.test(lower)) detected.push('URGENCY');
    if (/you're a|as a member|your journey/i.test(lower)) detected.push('IDENTITY_ALIGNMENT');
    return detected;
  }

  private generateSuggestions(content: string, type: ContentType, purpose: ContentPurpose): string[] {
    const suggestions: string[] = [];
    if (!/\?/.test(content)) suggestions.push('Consider adding a question to increase engagement');
    if (type === ContentType.EMAIL && !content.includes('{{')) suggestions.push('Add personalization variables like {{first_name}}');
    if (purpose === ContentPurpose.CANCEL_PREVENTION && !/\$/.test(content)) suggestions.push('Include specific value/savings amounts');
    if (content.split(/\s+/).length > 300) suggestions.push('Consider shortening for better engagement');
    return suggestions;
  }

  private calculateCost(provider: AIProvider, tokens: number): number {
    const rates: Record<AIProvider, number> = {
      [AIProvider.CLAUDE]: 0.000015,
      [AIProvider.OLLAMA]: 0,
      [AIProvider.BEDROCK]: 0.00001,
    };
    return tokens * (rates[provider] || 0);
  }

  private getContentTypeGuidelines(type: ContentType): string {
    const guidelines: Record<ContentType, string> = {
      [ContentType.EMAIL]: 'Write compelling email copy with clear subject lines and CTAs. Keep paragraphs short.',
      [ContentType.SMS]: 'Keep under 160 characters. Be direct and include one clear CTA.',
      [ContentType.PUSH_NOTIFICATION]: 'Keep under 50 characters. Create urgency or curiosity.',
      [ContentType.VOICE_SCRIPT]: 'Write conversational copy. Include [pause] markers. Keep sentences short.',
      [ContentType.AD_COPY]: 'Write punchy, benefit-focused copy. Include emotional hooks.',
      [ContentType.LANDING_PAGE]: 'Structure with headline, subheadline, benefits, proof, and CTA.',
      [ContentType.SOCIAL_POST]: 'Be casual and engaging. Use hashtags appropriately.',
      [ContentType.IN_APP_MESSAGE]: 'Be contextual and action-oriented. Keep under 100 words.',
      [ContentType.CHAT_RESPONSE]: 'Be helpful and conversational. Answer directly, then offer next steps.',
    };
    return guidelines[type] || '';
  }

  private getPurposeGuidelines(purpose: ContentPurpose): string {
    const guidelines: Record<ContentPurpose, string> = {
      [ContentPurpose.SAVE_FLOW]: "Focus on value they'll lose. Offer alternatives to cancellation.",
      [ContentPurpose.CANCEL_PREVENTION]: 'Acknowledge their concerns. Present compelling offers.',
      [ContentPurpose.WINBACK]: 'Reference positive past experiences. Offer incentive to return.',
      [ContentPurpose.WELCOME]: 'Be warm and helpful. Set expectations. Guide first steps.',
      [ContentPurpose.ONBOARDING]: 'Be instructive but friendly. Focus on quick wins.',
      [ContentPurpose.PAYMENT_FAILED]: 'Be helpful, not accusatory. Make updating easy.',
      [ContentPurpose.RE_ENGAGEMENT]: "Reference what they're missing. Create curiosity.",
      [ContentPurpose.TRIAL_CONVERSION]: 'Highlight value received. Create urgency around trial end.',
      [ContentPurpose.LEAD_NURTURE]: 'Provide value. Build trust gradually. Soft CTAs.',
      [ContentPurpose.ORDER_CONFIRMATION]: 'Confirm details. Set expectations for delivery.',
      [ContentPurpose.SHIPPING_UPDATE]: 'Clear status update. Tracking info prominent.',
      [ContentPurpose.PAYMENT_RECEIPT]: 'Clear breakdown. Thank them for purchase.',
      [ContentPurpose.SUBSCRIPTION_RENEWAL]: 'Remind of value. Clear billing info.',
      [ContentPurpose.PROMOTION]: 'Clear offer. Strong urgency. Compelling CTA.',
      [ContentPurpose.PRODUCT_LAUNCH]: 'Build excitement. Highlight benefits. Early access.',
      [ContentPurpose.NEWSLETTER]: 'Valuable content. Scannable format. Soft CTAs.',
      [ContentPurpose.SEASONAL]: 'Timely message. Relevant offer. Holiday appropriate.',
      [ContentPurpose.SUPPORT_RESPONSE]: 'Empathetic. Solution-focused. Clear next steps.',
      [ContentPurpose.FEEDBACK_REQUEST]: 'Value their opinion. Easy to respond. Brief.',
      [ContentPurpose.SURVEY]: 'Clear purpose. Time estimate. Incentive if possible.',
      [ContentPurpose.RMA_NOTIFICATION]: 'Clear status. Next steps. Helpful tone.',
    };
    return guidelines[purpose] || '';
  }

  private mapPurposeToContext(
    purpose: ContentPurpose,
  ): 'cancel_flow' | 'email' | 'sms' | 'landing_page' | 'checkout' | 'onboarding' {
    const mapping: Record<ContentPurpose, 'cancel_flow' | 'email' | 'sms' | 'landing_page' | 'checkout' | 'onboarding'> = {
      [ContentPurpose.SAVE_FLOW]: 'cancel_flow',
      [ContentPurpose.CANCEL_PREVENTION]: 'cancel_flow',
      [ContentPurpose.WINBACK]: 'email',
      [ContentPurpose.WELCOME]: 'onboarding',
      [ContentPurpose.ONBOARDING]: 'onboarding',
      [ContentPurpose.PROMOTION]: 'landing_page',
      [ContentPurpose.TRIAL_CONVERSION]: 'checkout',
      [ContentPurpose.LEAD_NURTURE]: 'email',
      [ContentPurpose.RE_ENGAGEMENT]: 'email',
      [ContentPurpose.ORDER_CONFIRMATION]: 'email',
      [ContentPurpose.SHIPPING_UPDATE]: 'email',
      [ContentPurpose.PAYMENT_RECEIPT]: 'email',
      [ContentPurpose.PAYMENT_FAILED]: 'email',
      [ContentPurpose.SUBSCRIPTION_RENEWAL]: 'email',
      [ContentPurpose.PRODUCT_LAUNCH]: 'landing_page',
      [ContentPurpose.NEWSLETTER]: 'email',
      [ContentPurpose.SEASONAL]: 'email',
      [ContentPurpose.SUPPORT_RESPONSE]: 'email',
      [ContentPurpose.FEEDBACK_REQUEST]: 'email',
      [ContentPurpose.SURVEY]: 'email',
      [ContentPurpose.RMA_NOTIFICATION]: 'email',
    };
    return mapping[purpose] || 'email';
  }

  private async getGenerationConfig(companyId: string): Promise<ContentGenerationConfig> {
    return {
      companyId,
      providers: { primary: AIProvider.CLAUDE, fallback: AIProvider.OLLAMA, routingRules: [] },
      claude: { model: 'claude-sonnet-4-20250514', temperature: 0.7, maxTokens: 1024, monthlyBudget: 100 },
      ollama: { model: 'llama3.1:8b', endpoint: 'http://localhost:11434', temperature: 0.7, maxTokens: 1024 },
      quality: { minQualityScore: 60, requireReview: false, reviewThreshold: 80, autoApprove: true, autoApproveMinScore: 75 },
      triggers: { autoApply: true, maxTriggersPerContent: 3, defaultTriggers: ['LOSS_AVERSION', 'SOCIAL_PROOF'], purposeTriggers: {} },
      brandVoice: {
        tone: ['friendly', 'helpful', 'professional'],
        personality: 'A knowledgeable friend who genuinely cares about your experience',
        avoidWords: ['cheap', 'buy now', 'limited time'],
        preferredPhrases: ['discover', 'explore', 'curated for you'],
      },
      personalization: { enabled: true, dynamicContent: true, aiPersonalization: true },
    };
  }

  private generateContentId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
