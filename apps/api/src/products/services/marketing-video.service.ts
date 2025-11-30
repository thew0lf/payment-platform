import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { PlatformIntegrationService } from '../../integrations/services/platform-integration.service';
import { BedrockService, BedrockCredentials } from '../../integrations/services/providers/bedrock.service';
import { RunwayService, RunwayCredentials, RunwaySettings } from '../../integrations/services/providers/runway.service';
import { S3StorageService, S3Credentials, S3Settings } from '../../integrations/services/providers/s3-storage.service';
import { getPromptForCategory, buildCustomPrompt } from '../../integrations/services/providers/runway-prompts';
import { IntegrationProvider } from '../../integrations/types/integration.types';
import {
  MarketingVideoType,
  VideoGenerationStatus,
  VideoPlatform,
  SceneMediaType,
} from '@prisma/client';
import {
  CreateMarketingVideoDto,
  UpdateMarketingVideoDto,
  GenerateVideoFromProductDto,
  GenerateSceneMediaDto,
  GenerateScriptDto,
  ListMarketingVideosQueryDto,
  CreateVideoTemplateDto,
  UpdateVideoTemplateDto,
} from '../dto/marketing-video.dto';

// Response types
export interface GeneratedScript {
  script: string;
  scenes: Array<{
    sceneNumber: number;
    duration: number;
    narration: string;
    visualDescription: string;
  }>;
  callToAction: string;
  estimatedDuration: number;
}

export interface VideoGenerationProgress {
  videoId: string;
  status: VideoGenerationStatus;
  progress: number;
  currentStep: string;
  error?: string;
}

@Injectable()
export class MarketingVideoService {
  private readonly logger = new Logger(MarketingVideoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly platformIntegrationService: PlatformIntegrationService,
    private readonly bedrockService: BedrockService,
    private readonly runwayService: RunwayService,
    private readonly s3StorageService: S3StorageService,
  ) {}

  // ============================================================================
  // Marketing Videos CRUD
  // ============================================================================

  /**
   * List marketing videos for a company
   */
  async listVideos(
    companyId: string,
    user: UserContext,
    query: ListMarketingVideosQueryDto,
  ) {
    await this.validateCompanyAccess(user, companyId);

    const where: any = { companyId };

    if (query.productId) {
      where.productId = query.productId;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.marketingVideo.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, sku: true },
          },
          template: {
            select: { id: true, name: true },
          },
          scenes: {
            orderBy: { sceneNumber: 'asc' },
          },
          variants: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit || 20,
        skip: query.offset || 0,
      }),
      this.prisma.marketingVideo.count({ where }),
    ]);

    return { items, total, limit: query.limit || 20, offset: query.offset || 0 };
  }

  /**
   * Get a single marketing video by ID
   */
  async getVideo(id: string, user: UserContext) {
    const video = await this.prisma.marketingVideo.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, name: true, sku: true, description: true },
        },
        template: true,
        scenes: {
          orderBy: { sceneNumber: 'asc' },
        },
        variants: true,
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Marketing video not found');
    }

    await this.validateCompanyAccess(user, video.companyId);

    return video;
  }

  /**
   * Create a new marketing video
   */
  async createVideo(
    companyId: string,
    dto: CreateMarketingVideoDto,
    user: UserContext,
  ) {
    await this.validateCompanyAccess(user, companyId);

    // Validate product if provided
    if (dto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: { id: true, companyId: true, deletedAt: true },
      });

      if (!product || product.deletedAt || product.companyId !== companyId) {
        throw new BadRequestException('Product not found or belongs to different company');
      }
    }

    // Validate template if provided
    if (dto.templateId) {
      const template = await this.prisma.marketingVideoTemplate.findUnique({
        where: { id: dto.templateId },
      });

      if (!template || (template.companyId && template.companyId !== companyId)) {
        throw new BadRequestException('Template not found or not accessible');
      }
    }

    const video = await this.prisma.marketingVideo.create({
      data: {
        companyId,
        productId: dto.productId,
        name: dto.name,
        type: dto.type,
        templateId: dto.templateId,
        style: dto.style as any,
        script: dto.script,
        voiceoverText: dto.voiceoverText,
        callToAction: dto.callToAction,
        customerId: dto.customerId,
        interventionId: dto.interventionId,
        createdById: user.sub,
        scenes: dto.scenes
          ? {
              create: dto.scenes.map((scene) => ({
                sceneNumber: scene.sceneNumber,
                duration: scene.duration,
                mediaType: scene.mediaType,
                mediaUrl: scene.mediaUrl,
                textOverlay: scene.textOverlay,
                textPosition: scene.textPosition,
                textStyle: scene.textStyle as any,
                transitionIn: scene.transitionIn,
                transitionOut: scene.transitionOut,
              })),
            }
          : undefined,
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
        template: {
          select: { id: true, name: true },
        },
        scenes: {
          orderBy: { sceneNumber: 'asc' },
        },
      },
    });

    this.logger.log(`Created marketing video ${video.id} for company ${companyId}`);
    return video;
  }

  /**
   * Update a marketing video
   */
  async updateVideo(id: string, dto: UpdateMarketingVideoDto, user: UserContext) {
    const video = await this.getVideo(id, user);

    const updated = await this.prisma.marketingVideo.update({
      where: { id },
      data: {
        name: dto.name,
        style: dto.style as any,
        script: dto.script,
        voiceoverText: dto.voiceoverText,
        callToAction: dto.callToAction,
        status: dto.status,
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
        template: {
          select: { id: true, name: true },
        },
        scenes: {
          orderBy: { sceneNumber: 'asc' },
        },
        variants: true,
      },
    });

    this.logger.log(`Updated marketing video ${id}`);
    return updated;
  }

  /**
   * Delete a marketing video
   */
  async deleteVideo(id: string, user: UserContext) {
    await this.getVideo(id, user);

    await this.prisma.marketingVideo.delete({
      where: { id },
    });

    this.logger.log(`Deleted marketing video ${id}`);
  }

  // ============================================================================
  // AI-Powered Generation
  // ============================================================================

  /**
   * Generate a complete video from a product
   */
  async generateFromProduct(
    companyId: string,
    dto: GenerateVideoFromProductDto,
    user: UserContext,
  ) {
    await this.validateCompanyAccess(user, companyId);

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
          take: 5,
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!product || product.deletedAt || product.companyId !== companyId) {
      throw new BadRequestException('Product not found');
    }

    // Create the video record in PENDING state
    const video = await this.prisma.marketingVideo.create({
      data: {
        companyId,
        productId: product.id,
        name: `${product.name} - Marketing Video`,
        type: dto.type || MarketingVideoType.PRODUCT_SHOWCASE,
        templateId: dto.templateId,
        style: dto.style as any,
        status: VideoGenerationStatus.PENDING,
        createdById: user.sub,
      },
    });

    this.logger.log(`Initiated video generation ${video.id} for product ${product.id}`);

    // Start async generation process
    this.processVideoGeneration(video.id, product, dto, user).catch((error) => {
      this.logger.error(`Video generation failed for ${video.id}: ${error.message}`);
      this.prisma.marketingVideo.update({
        where: { id: video.id },
        data: {
          status: VideoGenerationStatus.FAILED,
          generationError: error.message,
        },
      });
    });

    return {
      videoId: video.id,
      status: VideoGenerationStatus.PENDING,
      message: 'Video generation started. Poll the status endpoint for updates.',
    };
  }

  /**
   * Process video generation asynchronously
   */
  private async processVideoGeneration(
    videoId: string,
    product: any,
    dto: GenerateVideoFromProductDto,
    user: UserContext,
  ) {
    const organizationId = await this.getOrganizationId(user, product.companyId);

    try {
      // Step 1: Generate script if requested
      if (dto.generateScript !== false) {
        await this.prisma.marketingVideo.update({
          where: { id: videoId },
          data: { status: VideoGenerationStatus.GENERATING_SCRIPT },
        });

        const script = await this.generateScriptInternal(
          organizationId,
          product,
          dto.type || MarketingVideoType.PRODUCT_SHOWCASE,
          dto.customPrompt,
        );

        await this.prisma.marketingVideo.update({
          where: { id: videoId },
          data: {
            script: script.script,
            callToAction: script.callToAction,
          },
        });

        // Create scenes from script
        for (const scene of script.scenes) {
          await this.prisma.marketingVideoScene.create({
            data: {
              videoId,
              sceneNumber: scene.sceneNumber,
              duration: scene.duration,
              mediaType: SceneMediaType.PRODUCT_IMAGE,
              textOverlay: scene.narration,
            },
          });
        }
      }

      // Step 2: Generate AI video for first scene using Runway
      await this.prisma.marketingVideo.update({
        where: { id: videoId },
        data: {
          status: VideoGenerationStatus.GENERATING_MEDIA,
          generationStartedAt: new Date(),
        },
      });

      // Get first product image
      const firstImage = product.media?.[0];
      if (firstImage?.url) {
        const runwayCredentials = await this.getRunwayCredentials(organizationId);
        const s3Credentials = await this.getS3Credentials(organizationId);

        // Get category-specific prompt
        const categoryName = product.category?.name || 'general';
        const basePrompt = getPromptForCategory(categoryName);
        const prompt = buildCustomPrompt(basePrompt, {
          productName: product.name,
          style: dto.style?.mood,
          motion: 'subtle',
        });

        // Generate video clip
        const result = await this.runwayService.generateAndDownload(
          runwayCredentials,
          { defaultModel: 'gen3a_turbo', defaultDuration: 5 },
          {
            imageUrl: firstImage.url,
            prompt: dto.customPrompt || prompt,
            duration: 5,
            aspectRatio: '16:9',
          },
        );

        // Upload to S3
        const uploadResult = await this.s3StorageService.uploadFile(
          s3Credentials,
          result.buffer,
          `${videoId}_scene1.mp4`,
          {
            companyId: product.companyId,
            folder: 'videos',
            contentType: 'video/mp4',
          },
        );

        // Update scene with generated media
        await this.prisma.marketingVideoScene.updateMany({
          where: { videoId, sceneNumber: 1 },
          data: {
            mediaUrl: uploadResult.url,
            mediaType: SceneMediaType.AI_GENERATED_VIDEO,
            mediaGeneratedBy: 'RUNWAY',
          },
        });

        // Update video with output
        await this.prisma.marketingVideo.update({
          where: { id: videoId },
          data: {
            outputUrl: uploadResult.url,
            thumbnailUrl: uploadResult.thumbnails?.small,
            duration: result.duration,
            creditsUsed: result.creditsUsed,
          },
        });
      }

      // Step 3: Mark as complete
      await this.prisma.marketingVideo.update({
        where: { id: videoId },
        data: {
          status: VideoGenerationStatus.COMPLETED,
          generationCompletedAt: new Date(),
        },
      });

      this.logger.log(`Video generation completed for ${videoId}`);
    } catch (error: any) {
      this.logger.error(`Video generation failed: ${error.message}`);
      await this.prisma.marketingVideo.update({
        where: { id: videoId },
        data: {
          status: VideoGenerationStatus.FAILED,
          generationError: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Generate scene media using Runway
   */
  async generateSceneMedia(dto: GenerateSceneMediaDto, user: UserContext) {
    const video = await this.getVideo(dto.videoId, user);
    const organizationId = await this.getOrganizationId(user, video.companyId);

    const runwayCredentials = await this.getRunwayCredentials(organizationId);
    const s3Credentials = await this.getS3Credentials(organizationId);

    // Get source image
    let sourceImageUrl = dto.sourceImageUrl;
    if (!sourceImageUrl && video.productId) {
      const media = await this.prisma.productMedia.findFirst({
        where: { productId: video.productId },
        orderBy: { sortOrder: 'asc' },
      });
      sourceImageUrl = media?.url;
    }

    if (!sourceImageUrl) {
      throw new BadRequestException('No source image available for video generation');
    }

    // Generate video - duration must be 5 or 10
    const videoDuration: 5 | 10 = dto.duration === 10 ? 10 : 5;
    const result = await this.runwayService.generateAndDownload(
      runwayCredentials,
      { defaultModel: 'gen3a_turbo', defaultDuration: videoDuration },
      {
        imageUrl: sourceImageUrl,
        prompt: dto.prompt || 'Subtle product motion, professional showcase',
        duration: videoDuration,
        aspectRatio: dto.aspectRatio as any || '16:9',
      },
    );

    // Upload to S3
    const uploadResult = await this.s3StorageService.uploadFile(
      s3Credentials,
      result.buffer,
      `${dto.videoId}_scene${dto.sceneNumber}.mp4`,
      {
        companyId: video.companyId,
        folder: 'videos',
        contentType: 'video/mp4',
      },
    );

    // Update or create scene
    const existingScene = await this.prisma.marketingVideoScene.findFirst({
      where: { videoId: dto.videoId, sceneNumber: dto.sceneNumber },
    });

    if (existingScene) {
      await this.prisma.marketingVideoScene.update({
        where: { id: existingScene.id },
        data: {
          mediaUrl: uploadResult.url,
          mediaType: SceneMediaType.AI_GENERATED_VIDEO,
          mediaGeneratedBy: 'RUNWAY',
          duration: dto.duration || 5,
        },
      });
    } else {
      await this.prisma.marketingVideoScene.create({
        data: {
          videoId: dto.videoId,
          sceneNumber: dto.sceneNumber,
          duration: dto.duration || 5,
          mediaType: SceneMediaType.AI_GENERATED_VIDEO,
          mediaUrl: uploadResult.url,
          mediaGeneratedBy: 'RUNWAY',
        },
      });
    }

    this.logger.log(`Generated scene ${dto.sceneNumber} for video ${dto.videoId}`);

    return {
      videoUrl: uploadResult.url,
      duration: result.duration,
      creditsUsed: result.creditsUsed,
    };
  }

  /**
   * Generate a marketing script using AI
   */
  async generateScript(dto: GenerateScriptDto, user: UserContext): Promise<GeneratedScript> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        tags: { include: { tag: true } },
      },
    });

    if (!product || product.deletedAt) {
      throw new BadRequestException('Product not found');
    }

    await this.validateCompanyAccess(user, product.companyId);
    const organizationId = await this.getOrganizationId(user, product.companyId);

    return this.generateScriptInternal(
      organizationId,
      product,
      dto.type,
      dto.additionalContext,
      dto.targetDuration,
      dto.tone,
    );
  }

  private async generateScriptInternal(
    organizationId: string,
    product: any,
    type: MarketingVideoType,
    customPrompt?: string,
    targetDuration: number = 30,
    tone?: string,
  ): Promise<GeneratedScript> {
    const bedrockCredentials = await this.getBedrockCredentials(organizationId);

    const productTags = product.tags?.map((t: any) => t.tag?.name).filter(Boolean).join(', ') || '';

    const prompt = `Create a marketing video script for the following product:

Product Name: ${product.name}
Category: ${product.category?.name || 'General'}
Description: ${product.description || 'No description available'}
Tags: ${productTags}
Price: ${product.price ? `$${product.price}` : 'Not specified'}

Video Type: ${type.replace(/_/g, ' ').toLowerCase()}
Target Duration: ${targetDuration} seconds
Tone: ${tone || 'professional'}
${customPrompt ? `Additional Context: ${customPrompt}` : ''}

Please generate a compelling video script with the following structure:
1. An engaging hook (first 3 seconds)
2. Main content showcasing the product benefits
3. A clear call to action

Format your response as JSON with:
{
  "script": "Full narration script",
  "scenes": [
    {"sceneNumber": 1, "duration": 5, "narration": "...", "visualDescription": "..."},
    ...
  ],
  "callToAction": "Your CTA text",
  "estimatedDuration": number
}`;

    const result = await this.bedrockService.generateContent(
      bedrockCredentials,
      { prompt, maxTokens: 2000 },
    );

    try {
      // Extract JSON from response
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      this.logger.warn('Failed to parse script JSON, using fallback');
    }

    // Fallback response
    return {
      script: result.content,
      scenes: [
        {
          sceneNumber: 1,
          duration: targetDuration,
          narration: result.content,
          visualDescription: 'Product showcase',
        },
      ],
      callToAction: 'Shop now!',
      estimatedDuration: targetDuration,
    };
  }

  /**
   * Get video generation progress
   */
  async getProgress(videoId: string, user: UserContext): Promise<VideoGenerationProgress> {
    const video = await this.getVideo(videoId, user);

    const stepMap: Record<VideoGenerationStatus, string> = {
      [VideoGenerationStatus.PENDING]: 'Waiting to start',
      [VideoGenerationStatus.GENERATING_SCRIPT]: 'Generating script',
      [VideoGenerationStatus.GENERATING_MEDIA]: 'Generating video clips',
      [VideoGenerationStatus.GENERATING_VOICE]: 'Generating voiceover',
      [VideoGenerationStatus.COMPOSING]: 'Composing final video',
      [VideoGenerationStatus.EXPORTING]: 'Exporting video',
      [VideoGenerationStatus.COMPLETED]: 'Complete',
      [VideoGenerationStatus.FAILED]: 'Failed',
    };

    const progressMap: Record<VideoGenerationStatus, number> = {
      [VideoGenerationStatus.PENDING]: 0,
      [VideoGenerationStatus.GENERATING_SCRIPT]: 20,
      [VideoGenerationStatus.GENERATING_MEDIA]: 50,
      [VideoGenerationStatus.GENERATING_VOICE]: 70,
      [VideoGenerationStatus.COMPOSING]: 85,
      [VideoGenerationStatus.EXPORTING]: 95,
      [VideoGenerationStatus.COMPLETED]: 100,
      [VideoGenerationStatus.FAILED]: 0,
    };

    return {
      videoId: video.id,
      status: video.status,
      progress: progressMap[video.status] || 0,
      currentStep: stepMap[video.status] || 'Unknown',
      error: video.generationError || undefined,
    };
  }

  // ============================================================================
  // Video Templates
  // ============================================================================

  /**
   * List video templates
   */
  async listTemplates(companyId: string, user: UserContext) {
    await this.validateCompanyAccess(user, companyId);

    return this.prisma.marketingVideoTemplate.findMany({
      where: {
        OR: [
          { companyId },
          { isSystem: true },
        ],
        isActive: true,
      },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Create a custom template
   */
  async createTemplate(
    companyId: string,
    dto: CreateVideoTemplateDto,
    user: UserContext,
  ) {
    await this.validateCompanyAccess(user, companyId);

    const template = await this.prisma.marketingVideoTemplate.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        sceneCount: dto.sceneCount,
        defaultDuration: dto.defaultDuration,
        structure: dto.structure as any,
        defaultStyle: dto.defaultStyle as any,
        scriptTemplate: dto.scriptTemplate,
        isActive: dto.isActive ?? true,
        isSystem: false,
      },
    });

    this.logger.log(`Created video template ${template.id} for company ${companyId}`);
    return template;
  }

  /**
   * Update a custom template
   */
  async updateTemplate(
    id: string,
    dto: UpdateVideoTemplateDto,
    user: UserContext,
  ) {
    const template = await this.prisma.marketingVideoTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.isSystem) {
      throw new BadRequestException('Cannot modify system templates');
    }

    if (template.companyId) {
      await this.validateCompanyAccess(user, template.companyId);
    }

    const updated = await this.prisma.marketingVideoTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        sceneCount: dto.sceneCount,
        defaultDuration: dto.defaultDuration,
        structure: dto.structure as any,
        defaultStyle: dto.defaultStyle as any,
        scriptTemplate: dto.scriptTemplate,
        isActive: dto.isActive,
      },
    });

    this.logger.log(`Updated video template ${id}`);
    return updated;
  }

  /**
   * Delete a custom template
   */
  async deleteTemplate(id: string, user: UserContext) {
    const template = await this.prisma.marketingVideoTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system templates');
    }

    if (template.companyId) {
      await this.validateCompanyAccess(user, template.companyId);
    }

    await this.prisma.marketingVideoTemplate.delete({
      where: { id },
    });

    this.logger.log(`Deleted video template ${id}`);
  }

  // ============================================================================
  // Platform Variants
  // ============================================================================

  /**
   * Generate video variants for different platforms
   */
  async generateVariants(
    videoId: string,
    platforms: VideoPlatform[],
    user: UserContext,
  ) {
    const video = await this.getVideo(videoId, user);

    if (video.status !== VideoGenerationStatus.COMPLETED || !video.outputUrl) {
      throw new BadRequestException('Video must be completed before generating variants');
    }

    const results = [];

    for (const platform of platforms) {
      const aspectRatio = this.getPlatformAspectRatio(platform);

      // For now, create variant records pointing to the main video
      // In production, this would re-encode/crop the video
      const variant = await this.prisma.marketingVideoVariant.upsert({
        where: {
          videoId_platform: {
            videoId,
            platform,
          },
        },
        update: {
          aspectRatio,
          outputUrl: video.outputUrl,
          thumbnailUrl: video.thumbnailUrl,
          metadata: { generatedAt: new Date() },
        },
        create: {
          videoId,
          platform,
          aspectRatio,
          outputUrl: video.outputUrl,
          thumbnailUrl: video.thumbnailUrl,
          metadata: { generatedAt: new Date() },
        },
      });

      results.push(variant);
    }

    this.logger.log(`Generated ${results.length} variants for video ${videoId}`);
    return results;
  }

  private getPlatformAspectRatio(platform: VideoPlatform): string {
    const aspectRatios: Record<VideoPlatform, string> = {
      [VideoPlatform.TIKTOK]: '9:16',
      [VideoPlatform.INSTAGRAM_REELS]: '9:16',
      [VideoPlatform.INSTAGRAM_STORIES]: '9:16',
      [VideoPlatform.INSTAGRAM_FEED]: '1:1',
      [VideoPlatform.FACEBOOK_REELS]: '9:16',
      [VideoPlatform.FACEBOOK_FEED]: '16:9',
      [VideoPlatform.YOUTUBE_SHORTS]: '9:16',
      [VideoPlatform.YOUTUBE]: '16:9',
      [VideoPlatform.TWITTER]: '16:9',
      [VideoPlatform.LINKEDIN]: '16:9',
    };
    return aspectRatios[platform] || '16:9';
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async validateCompanyAccess(user: UserContext, companyId: string) {
    const hasAccess = await this.hierarchyService.canAccessCompany(user, companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this company');
    }
  }

  private async getOrganizationId(user: UserContext, companyId?: string): Promise<string> {
    if (user.organizationId) {
      return user.organizationId;
    }

    const resolveCompanyId = companyId || user.companyId;
    if (resolveCompanyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: resolveCompanyId },
        select: {
          client: {
            select: { organizationId: true },
          },
        },
      });

      if (company?.client?.organizationId) {
        return company.client.organizationId;
      }
    }

    if (user.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: user.clientId },
        select: { organizationId: true },
      });

      if (client?.organizationId) {
        return client.organizationId;
      }
    }

    throw new BadRequestException('Could not determine organization for integration lookup');
  }

  private async getBedrockCredentials(organizationId: string): Promise<BedrockCredentials> {
    const integration = await this.platformIntegrationService.getByProvider(
      organizationId,
      IntegrationProvider.AWS_BEDROCK,
    );

    if (!integration) {
      throw new BadRequestException(
        'AWS Bedrock integration not configured. Required for script generation.',
      );
    }

    const credentials = await this.platformIntegrationService.getDecryptedCredentials(integration.id);

    return {
      region: credentials.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      modelId: credentials.modelId,
    };
  }

  private async getRunwayCredentials(organizationId: string): Promise<RunwayCredentials> {
    const integration = await this.platformIntegrationService.getByProvider(
      organizationId,
      IntegrationProvider.RUNWAY,
    );

    if (!integration) {
      throw new BadRequestException(
        'Runway integration not configured. Required for video generation.',
      );
    }

    const credentials = await this.platformIntegrationService.getDecryptedCredentials(integration.id);

    return {
      apiKey: credentials.apiKey,
      apiVersion: credentials.apiVersion,
    };
  }

  private async getS3Credentials(organizationId: string): Promise<S3Credentials & { bucket: string }> {
    const integration = await this.platformIntegrationService.getByProvider(
      organizationId,
      IntegrationProvider.AWS_S3,
    );

    if (!integration) {
      throw new BadRequestException(
        'AWS S3 integration not configured. Required for video storage.',
      );
    }

    const credentials = await this.platformIntegrationService.getDecryptedCredentials(integration.id);

    return {
      region: credentials.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      bucket: credentials.bucket,
    };
  }
}
