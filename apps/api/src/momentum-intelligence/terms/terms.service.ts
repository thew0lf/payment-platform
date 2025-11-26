import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TermsType,
  TermsStatus,
  ReadabilityLevel,
  SummaryFormat,
  ComplianceFramework,
  TermsDocument,
  TermsSummary,
  TermsAcceptance,
  TermsGenerationConfig,
  GeneratedTerms,
  CreateTermsDto,
  UpdateTermsDto,
  PublishTermsDto,
  GenerateSummaryDto,
  GenerateTermsDto,
  RecordAcceptanceDto,
  GetTermsDto,
  GetAcceptancesDto,
  TermsAnalyticsDto,
  TermsAnalytics,
  CustomerTermsView,
  TermsSearchResult,
} from '../types/terms.types';

@Injectable()
export class TermsService {
  private readonly logger = new Logger(TermsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // TERMS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async createTerms(dto: CreateTermsDto): Promise<TermsDocument> {
    this.logger.log(`Creating terms document of type ${dto.type}`);

    let document: TermsDocument;

    if (dto.generateWithAI && dto.generationConfig) {
      // Generate terms using AI
      const generated = await this.generateTermsWithAI({
        companyId: dto.companyId,
        ...dto.generationConfig,
      });
      document = generated.document;
    } else {
      // Create manual terms document
      document = {
        id: this.generateTermsId(),
        companyId: dto.companyId,
        type: dto.type,
        title: dto.title,
        version: '1.0.0',
        status: TermsStatus.DRAFT,

        content: {
          fullText: dto.content?.fullText || '',
          sections: (dto.content?.sections || []).map((s, i) => ({
            id: this.generateSectionId(),
            title: s.title,
            content: s.content,
            order: i,
          })),
          readabilityScore: 0,
          wordCount: dto.content?.fullText?.split(/\s+/).length || 0,
          estimatedReadTime: Math.ceil((dto.content?.fullText?.split(/\s+/).length || 0) / 200),
          language: 'en',
        },

        metadata: {
          generatedBy: 'human',
          legalReviewRequired: false,
          tags: dto.metadata?.tags,
          internalNotes: dto.metadata?.internalNotes,
        },

        compliance: {
          frameworks: dto.compliance?.frameworks || [],
          jurisdictions: dto.compliance?.jurisdictions || [],
          requirements: [],
        },

        summaries: [],
        history: [],

        analytics: {
          totalViews: 0,
          uniqueViews: 0,
          avgTimeOnPage: 0,
          acceptanceRate: 0,
          totalAcceptances: 0,
          sectionViews: {},
          searchQueries: [],
          faqClicks: {},
        },

        createdAt: new Date(),
        updatedAt: new Date(),
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
      };

      // Calculate readability score
      document.content.readabilityScore = this.calculateReadabilityScore(document.content.fullText);
    }

    // Emit creation event
    this.eventEmitter.emit('terms.created', {
      termsId: document.id,
      type: dto.type,
      generatedByAI: dto.generateWithAI,
    });

    this.logger.log(`Terms document ${document.id} created`);
    return document;
  }

  async updateTerms(dto: UpdateTermsDto): Promise<TermsDocument> {
    const document = await this.getTermsDocument(dto.termsId);

    if (!document) {
      throw new NotFoundException(`Terms document ${dto.termsId} not found`);
    }

    // Check if we need to create a new version
    if (dto.createNewVersion) {
      const newVersion = this.incrementVersion(document.version);

      // Archive current version
      document.history.push({
        version: document.version,
        publishedAt: document.publishedAt || document.createdAt,
        effectiveDate: document.effectiveDate || document.createdAt,
        changesSummary: dto.changesSummary || 'Version update',
        changedSections: dto.content?.sections?.map(s => s.title) || [],
        status: document.status,
      });

      document.version = newVersion;
      document.status = TermsStatus.DRAFT;
    }

    // Update fields
    if (dto.title) document.title = dto.title;
    if (dto.effectiveDate) document.effectiveDate = new Date(dto.effectiveDate);
    if (dto.status) document.status = dto.status;

    if (dto.content) {
      if (dto.content.fullText) {
        document.content.fullText = dto.content.fullText;
        document.content.wordCount = dto.content.fullText.split(/\s+/).length;
        document.content.estimatedReadTime = Math.ceil(document.content.wordCount / 200);
        document.content.readabilityScore = this.calculateReadabilityScore(dto.content.fullText);
      }
      if (dto.content.sections) {
        document.content.sections = dto.content.sections.map((s, i) => ({
          id: this.generateSectionId(),
          title: s.title,
          content: s.content,
          order: i,
        }));
      }
    }

    if (dto.compliance) {
      if (dto.compliance.frameworks) document.compliance.frameworks = dto.compliance.frameworks;
      if (dto.compliance.jurisdictions) document.compliance.jurisdictions = dto.compliance.jurisdictions;
    }

    document.updatedAt = new Date();
    document.metadata.lastModifiedBy = 'user'; // In production, get from auth context

    // Emit update event
    this.eventEmitter.emit('terms.updated', {
      termsId: document.id,
      newVersion: dto.createNewVersion,
    });

    return document;
  }

  async publishTerms(dto: PublishTermsDto): Promise<TermsDocument> {
    const document = await this.getTermsDocument(dto.termsId);

    if (!document) {
      throw new NotFoundException(`Terms document ${dto.termsId} not found`);
    }

    if (document.status === TermsStatus.ACTIVE) {
      throw new BadRequestException('Terms are already published');
    }

    // Update previous active version to superseded
    // In production, query database for active version

    document.status = TermsStatus.ACTIVE;
    document.publishedAt = new Date();
    document.effectiveDate = new Date(dto.effectiveDate);
    document.updatedAt = new Date();

    // Send notifications if requested
    if (dto.notifyUsers) {
      await this.sendTermsNotifications(document, dto);
    }

    // Emit publish event
    this.eventEmitter.emit('terms.published', {
      termsId: document.id,
      version: document.version,
      effectiveDate: document.effectiveDate,
    });

    return document;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  async generateTermsWithAI(config: TermsGenerationConfig): Promise<GeneratedTerms> {
    this.logger.log(`Generating terms with AI for company ${config.companyId}`);

    // In production, this would call Anthropic Claude API
    // For now, generate a structured template

    const document: TermsDocument = {
      id: this.generateTermsId(),
      companyId: config.companyId,
      type: config.generationOptions.termsTypes[0] || TermsType.TERMS_OF_SERVICE,
      title: this.generateTitle(config),
      version: '1.0.0',
      status: TermsStatus.DRAFT,

      content: {
        fullText: this.generateFullText(config),
        sections: this.generateSections(config),
        readabilityScore: 75,
        wordCount: 2500,
        estimatedReadTime: 13,
        language: 'en',
      },

      metadata: {
        generatedBy: 'ai',
        legalReviewRequired: true,
        aiModel: 'claude-3-sonnet',
        aiPromptVersion: '1.0',
      },

      compliance: {
        frameworks: config.complianceRequirements.frameworks,
        jurisdictions: config.businessContext.operatingCountries,
        requirements: this.generateComplianceRequirements(config),
      },

      summaries: [],
      history: [],

      analytics: {
        totalViews: 0,
        uniqueViews: 0,
        avgTimeOnPage: 0,
        acceptanceRate: 0,
        totalAcceptances: 0,
        sectionViews: {},
        searchQueries: [],
        faqClicks: {},
      },

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate summaries if requested
    if (config.generationOptions.includeSummaries) {
      for (const format of config.generationOptions.summaryFormats) {
        const summary = await this.generateSummary({
          termsId: document.id,
          format,
          level: config.generationOptions.readabilityLevel,
        });
        document.summaries.push(summary);
      }
    }

    return {
      document,
      suggestions: [
        {
          section: 'Data Collection',
          suggestion: 'Consider adding more specific details about third-party data sharing',
          reason: 'GDPR requires explicit disclosure of data recipients',
          priority: 'high',
        },
        {
          section: 'User Rights',
          suggestion: 'Add section on right to data portability',
          reason: 'Required under GDPR Article 20',
          priority: 'medium',
        },
      ],
      complianceGaps: [
        {
          framework: ComplianceFramework.GDPR,
          gap: 'Missing Data Protection Officer contact information',
          recommendation: 'Add DPO contact details in the privacy section',
          severity: 'high',
        },
        {
          framework: ComplianceFramework.CCPA,
          gap: 'Missing "Do Not Sell My Information" disclosure',
          recommendation: 'Add CCPA-specific disclosure section',
          severity: 'medium',
        },
      ],
      readabilityAnalysis: {
        score: 75,
        grade: 'College',
        improvements: [
          'Consider simplifying technical terms in Section 3',
          'Break up long paragraphs in the liability section',
          'Add more bullet points for easier scanning',
        ],
      },
    };
  }

  async generateSummary(dto: GenerateSummaryDto): Promise<TermsSummary> {
    // In production, this would call Claude API to summarize
    const summary: TermsSummary = {
      id: this.generateSummaryId(),
      format: dto.format,
      level: dto.level,
      content: this.generateSummaryContent(dto.format, dto.level),
      keyPoints: [
        'You agree to use the service only for lawful purposes',
        'We collect data to provide and improve our services',
        'You can cancel your subscription at any time',
        'We may update these terms with 30 days notice',
        'Disputes will be resolved through arbitration',
      ],
      faqs: [
        {
          question: 'How can I cancel my subscription?',
          answer: 'You can cancel anytime through your account settings or by contacting support.',
          section: 'Cancellation',
        },
        {
          question: 'What data do you collect?',
          answer: 'We collect usage data, account information, and payment details necessary to provide our service.',
          section: 'Privacy',
        },
        {
          question: 'Can I get a refund?',
          answer: 'Refunds are available within 30 days of purchase for unused products.',
          section: 'Refunds',
        },
      ],
      importantDates: [
        { description: 'Free trial period', duration: '14 days' },
        { description: 'Refund window', duration: '30 days' },
        { description: 'Data retention', duration: '2 years after account closure' },
      ],
      userRights: [
        'Right to access your data',
        'Right to delete your account',
        'Right to export your data',
        'Right to opt-out of marketing',
      ],
      userObligations: [
        'Provide accurate account information',
        'Keep your password secure',
        'Use service in compliance with laws',
        'Respect intellectual property rights',
      ],
      createdAt: new Date(),
      language: dto.language || 'en',
    };

    return summary;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCEPTANCE TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  async recordAcceptance(dto: RecordAcceptanceDto): Promise<TermsAcceptance> {
    const document = await this.getTermsDocument(dto.termsDocumentId);

    if (!document) {
      throw new NotFoundException(`Terms document ${dto.termsDocumentId} not found`);
    }

    if (document.status !== TermsStatus.ACTIVE) {
      throw new BadRequestException('Can only accept active terms');
    }

    const acceptance: TermsAcceptance = {
      id: this.generateAcceptanceId(),
      termsDocumentId: dto.termsDocumentId,
      termsVersion: document.version,
      customerId: dto.customerId,
      userId: dto.userId,
      acceptedAt: new Date(),
      acceptanceMethod: dto.acceptanceMethod,
      metadata: dto.metadata,
    };

    // Update analytics
    document.analytics.totalAcceptances++;

    // Emit acceptance event
    this.eventEmitter.emit('terms.accepted', {
      termsId: dto.termsDocumentId,
      customerId: dto.customerId,
      version: document.version,
    });

    return acceptance;
  }

  async getAcceptances(dto: GetAcceptancesDto): Promise<{ acceptances: TermsAcceptance[]; total: number }> {
    // In production, fetch from database
    return { acceptances: [], total: 0 };
  }

  async checkAcceptance(termsId: string, customerId: string): Promise<boolean> {
    // In production, check database
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER-FACING
  // ═══════════════════════════════════════════════════════════════════════════

  async getCustomerTermsView(termsId: string, customerId?: string): Promise<CustomerTermsView> {
    const document = await this.getTermsDocument(termsId);

    if (!document) {
      throw new NotFoundException(`Terms document ${termsId} not found`);
    }

    // Track view
    document.analytics.totalViews++;
    if (customerId) {
      document.analytics.uniqueViews++;
    }

    // Get best summary for customer
    const summary = document.summaries.find(s => s.format === SummaryFormat.KEY_POINTS) || document.summaries[0];

    // Check if customer has accepted
    let previouslyAccepted = false;
    let acceptedAt: Date | undefined;
    if (customerId) {
      previouslyAccepted = await this.checkAcceptance(termsId, customerId);
    }

    return {
      id: document.id,
      type: document.type,
      title: document.title,
      version: document.version,
      effectiveDate: document.effectiveDate!,
      summary: summary || {
        id: 'default',
        format: SummaryFormat.KEY_POINTS,
        level: ReadabilityLevel.STANDARD,
        content: 'Please review our terms and conditions.',
        createdAt: new Date(),
        language: 'en',
      },
      sections: document.content.sections.map(s => ({
        id: s.id,
        title: s.title,
        content: s.content,
        keyPoints: s.keyPoints || [],
      })),
      faqs: summary?.faqs,
      acceptanceRequired: true,
      previouslyAccepted,
      acceptedAt,
    };
  }

  async searchTerms(query: string, companyId: string): Promise<TermsSearchResult[]> {
    // In production, use full-text search
    return [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async getTermsDocument(termsId: string): Promise<TermsDocument | null> {
    // In production, fetch from database
    return null;
  }

  async getTermsDocuments(dto: GetTermsDto): Promise<{ documents: TermsDocument[]; total: number }> {
    // In production, fetch from database with filters
    return { documents: [], total: 0 };
  }

  async getActiveTerms(companyId: string, type: TermsType): Promise<TermsDocument | null> {
    // In production, fetch active terms from database
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getAnalytics(dto: TermsAnalyticsDto): Promise<TermsAnalytics> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    return {
      period: { start: startDate, end: endDate },
      overview: {
        totalDocuments: 8,
        activeDocuments: 5,
        totalViews: 15000,
        totalAcceptances: 8500,
        avgAcceptanceRate: 85,
        avgReadTime: 4.5,
      },
      byType: [
        { type: TermsType.TERMS_OF_SERVICE, documents: 1, views: 5000, acceptances: 4500, acceptanceRate: 90 },
        { type: TermsType.PRIVACY_POLICY, documents: 1, views: 4500, acceptances: 4200, acceptanceRate: 93 },
        { type: TermsType.REFUND_POLICY, documents: 1, views: 2500, acceptances: 0, acceptanceRate: 0 },
        { type: TermsType.SUBSCRIPTION_TERMS, documents: 1, views: 3000, acceptances: 2800, acceptanceRate: 93 },
      ],
      viewTrends: [
        { date: '2024-01-01', views: 520, uniqueViews: 450, acceptances: 285 },
        { date: '2024-01-02', views: 485, uniqueViews: 420, acceptances: 265 },
        { date: '2024-01-03', views: 550, uniqueViews: 480, acceptances: 305 },
      ],
      sectionEngagement: [
        { section: 'Introduction', views: 15000, avgTimeSpent: 15, dropOffRate: 5 },
        { section: 'Data Collection', views: 14250, avgTimeSpent: 45, dropOffRate: 12 },
        { section: 'User Rights', views: 12500, avgTimeSpent: 60, dropOffRate: 8 },
        { section: 'Liability', views: 11500, avgTimeSpent: 30, dropOffRate: 15 },
        { section: 'Termination', views: 9750, avgTimeSpent: 25, dropOffRate: 10 },
      ],
      searchAnalytics: [
        { query: 'refund', count: 450, resultClicks: 380 },
        { query: 'cancel subscription', count: 320, resultClicks: 290 },
        { query: 'data deletion', count: 280, resultClicks: 250 },
        { query: 'privacy', count: 220, resultClicks: 200 },
      ],
      complianceStatus: [
        { framework: ComplianceFramework.GDPR, status: 'compliant', lastChecked: new Date(), issues: 0 },
        { framework: ComplianceFramework.CCPA, status: 'compliant', lastChecked: new Date(), issues: 0 },
        { framework: ComplianceFramework.PCI_DSS, status: 'partial', lastChecked: new Date(), issues: 2 },
      ],
      userFeedback: {
        clarityScore: 4.2,
        helpfulnessScore: 4.0,
        commonQuestions: [
          'How do I cancel?',
          'What data do you collect?',
          'How long is my data stored?',
        ],
        improvementSuggestions: [
          'Simplify legal language',
          'Add more examples',
          'Improve mobile layout',
        ],
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private generateTitle(config: TermsGenerationConfig): string {
    const typeNames: Record<TermsType, string> = {
      [TermsType.TERMS_OF_SERVICE]: 'Terms of Service',
      [TermsType.PRIVACY_POLICY]: 'Privacy Policy',
      [TermsType.REFUND_POLICY]: 'Refund Policy',
      [TermsType.SHIPPING_POLICY]: 'Shipping Policy',
      [TermsType.SUBSCRIPTION_TERMS]: 'Subscription Terms',
      [TermsType.COOKIE_POLICY]: 'Cookie Policy',
      [TermsType.ACCEPTABLE_USE]: 'Acceptable Use Policy',
      [TermsType.DATA_PROCESSING]: 'Data Processing Agreement',
      [TermsType.SLA]: 'Service Level Agreement',
      [TermsType.CUSTOM]: 'Terms and Conditions',
    };

    return `${config.businessContext.companyName} ${typeNames[config.generationOptions.termsTypes[0]] || 'Terms'}`;
  }

  private generateFullText(config: TermsGenerationConfig): string {
    // In production, this would be AI-generated
    return `Welcome to ${config.businessContext.companyName}. These Terms of Service govern your use of our services...`;
  }

  private generateSections(config: TermsGenerationConfig) {
    // Standard sections based on type
    const baseSections = [
      { title: 'Acceptance of Terms', content: 'By accessing and using this service...', order: 1 },
      { title: 'Description of Service', content: `${config.businessContext.companyName} provides...`, order: 2 },
      { title: 'User Accounts', content: 'To access certain features...', order: 3 },
      { title: 'Payment Terms', content: 'If you purchase our products or services...', order: 4 },
      { title: 'Intellectual Property', content: 'All content and materials...', order: 5 },
      { title: 'Limitation of Liability', content: 'To the fullest extent permitted by law...', order: 6 },
      { title: 'Termination', content: 'We may terminate or suspend your access...', order: 7 },
      { title: 'Governing Law', content: 'These Terms shall be governed by...', order: 8 },
      { title: 'Contact Information', content: `For questions, contact: ${config.businessContext.contactInfo.email}`, order: 9 },
    ];

    return baseSections.map(s => ({
      id: this.generateSectionId(),
      ...s,
    }));
  }

  private generateComplianceRequirements(config: TermsGenerationConfig) {
    return config.complianceRequirements.frameworks.map(framework => ({
      framework,
      requirement: `Compliance with ${framework} requirements`,
      section: 'Data Protection',
      status: 'met' as const,
    }));
  }

  private generateSummaryContent(format: SummaryFormat, level: ReadabilityLevel): string {
    const summaries: Record<SummaryFormat, string> = {
      [SummaryFormat.BULLET_POINTS]: '• You agree to our terms by using our service\n• We collect data to improve your experience\n• You can cancel anytime\n• Contact us for questions',
      [SummaryFormat.FAQ]: 'This document answers common questions about using our service, your rights, and your responsibilities.',
      [SummaryFormat.PLAIN_LANGUAGE]: 'In simple terms: When you use our service, you agree to these rules. We respect your privacy and you can leave whenever you want.',
      [SummaryFormat.KEY_POINTS]: 'Key Points: 1) Accept terms to use service 2) Your data is protected 3) Cancel anytime 4) Disputes resolved through arbitration',
      [SummaryFormat.COMPARISON]: 'What changed from the previous version: Updated data retention policies, clarified refund process, added new user rights.',
    };
    return summaries[format];
  }

  private calculateReadabilityScore(text: string): number {
    // Simplified Flesch-Kincaid readability calculation
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const syllables = this.countSyllables(text);

    if (words === 0 || sentences === 0) return 0;

    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;
    for (const word of words) {
      const matches = word.match(/[aeiouy]+/g);
      count += matches ? matches.length : 1;
    }
    return count;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2]++; // Increment patch version
    return parts.join('.');
  }

  private async sendTermsNotifications(
    document: TermsDocument,
    dto: PublishTermsDto,
  ): Promise<void> {
    // In production, send notifications via configured channels
    this.logger.log(`Sending terms update notifications for ${document.id}`);

    this.eventEmitter.emit('terms.notification.send', {
      termsId: document.id,
      channels: dto.notificationChannels,
      message: dto.notificationMessage,
    });
  }

  private generateTermsId(): string {
    return `terms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSectionId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSummaryId(): string {
    return `sum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAcceptanceId(): string {
    return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
