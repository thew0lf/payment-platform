import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateReviewConfigDto } from '../review.types';

@Injectable()
export class ReviewConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(companyId: string) {
    const config = await this.prisma.reviewConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      // Return default config
      return this.getDefaultConfig(companyId);
    }

    return config;
  }

  async updateConfig(companyId: string, dto: UpdateReviewConfigDto) {
    const existing = await this.prisma.reviewConfig.findUnique({
      where: { companyId },
    });

    if (existing) {
      return this.prisma.reviewConfig.update({
        where: { companyId },
        data: dto,
      });
    }

    // Create with defaults + updates
    return this.prisma.reviewConfig.create({
      data: {
        companyId,
        ...dto,
      },
    });
  }

  async getWidgetConfig(companyId: string) {
    const config = await this.getConfig(companyId);

    // Return only public widget configuration
    return {
      enabled: config.enabled,
      showVerifiedBadge: config.showVerifiedBadge,
      showReviewerName: config.showReviewerName,
      showReviewDate: config.showReviewDate,
      allowAnonymous: config.allowAnonymous,
      sortDefault: config.sortDefault,
      allowMedia: config.allowMedia,
      maxMediaPerReview: config.maxMediaPerReview,
      allowProsAndCons: config.allowProsAndCons,
      minReviewLength: config.minReviewLength,
      maxReviewLength: config.maxReviewLength,
      widgetTheme: config.widgetTheme,
      widgetPosition: config.widgetPosition,
      widgetPrimaryColor: config.widgetPrimaryColor,
      incentiveEnabled: config.incentiveEnabled,
      incentiveType: config.incentiveType,
      incentiveValue: config.incentiveValue,
    };
  }

  async generateEmbedCode(companyId: string, productId?: string): Promise<string> {
    const config = await this.getConfig(companyId);

    const baseUrl = process.env.WIDGET_BASE_URL || 'https://widget.avnz.io';

    const embedCode = `
<!-- AVNZ Reviews Widget -->
<div id="avnz-reviews" data-company="${companyId}"${productId ? ` data-product="${productId}"` : ''}></div>
<script src="${baseUrl}/reviews.js" async></script>
<style>
  #avnz-reviews {
    --avnz-primary: ${config.widgetPrimaryColor};
    font-family: inherit;
  }
</style>
<!-- End AVNZ Reviews Widget -->
`.trim();

    return embedCode;
  }

  private getDefaultConfig(companyId: string) {
    return {
      id: null,
      companyId,
      enabled: true,
      autoApprove: false,
      requireVerifiedPurchase: false,
      minRatingForAutoApprove: null,
      moderationKeywords: [],
      showVerifiedBadge: true,
      showReviewerName: true,
      showReviewDate: true,
      allowAnonymous: true,
      sortDefault: 'newest',
      minReviewLength: 0,
      maxReviewLength: 5000,
      allowMedia: true,
      maxMediaPerReview: 5,
      allowProsAndCons: true,
      sendReviewRequest: true,
      reviewRequestDelay: 7,
      sendResponseNotification: true,
      widgetTheme: 'light',
      widgetPosition: 'bottom',
      widgetPrimaryColor: '#3B82F6',
      widgetCustomCss: null,
      enableRichSnippets: true,
      schemaType: 'Product',
      incentiveEnabled: false,
      incentiveType: null,
      incentiveValue: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
