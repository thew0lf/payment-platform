import { apiRequest } from '../api';

// ============================================================================
// Types
// ============================================================================

export type MarketingVideoType =
  | 'PRODUCT_SHOWCASE'
  | 'PRODUCT_LAUNCH'
  | 'SALE_PROMO'
  | 'TESTIMONIAL'
  | 'TUTORIAL'
  | 'BRAND_STORY'
  | 'RETENTION_WINBACK'
  | 'RETENTION_ANNIVERSARY'
  | 'RETENTION_REMINDER'
  | 'SOCIAL_AD';

export type VideoGenerationStatus =
  | 'PENDING'
  | 'GENERATING_SCRIPT'
  | 'GENERATING_MEDIA'
  | 'GENERATING_VOICE'
  | 'COMPOSING'
  | 'EXPORTING'
  | 'COMPLETED'
  | 'FAILED';

export type SceneMediaType =
  | 'PRODUCT_IMAGE'
  | 'AI_GENERATED_VIDEO'
  | 'STOCK_VIDEO'
  | 'SOLID_COLOR'
  | 'GRADIENT';

export type VideoPlatform =
  | 'TIKTOK'
  | 'INSTAGRAM_REELS'
  | 'INSTAGRAM_STORIES'
  | 'INSTAGRAM_FEED'
  | 'FACEBOOK_REELS'
  | 'FACEBOOK_FEED'
  | 'YOUTUBE_SHORTS'
  | 'YOUTUBE'
  | 'TWITTER'
  | 'LINKEDIN';

export interface MarketingVideoScene {
  id: string;
  videoId: string;
  sceneNumber: number;
  duration: number;
  mediaType: SceneMediaType;
  mediaUrl?: string;
  mediaGeneratedBy?: string;
  textOverlay?: string;
  textPosition?: string;
  textStyle?: Record<string, unknown>;
  transitionIn?: string;
  transitionOut?: string;
  createdAt: string;
}

export interface MarketingVideoVariant {
  id: string;
  videoId: string;
  platform: VideoPlatform;
  aspectRatio: string;
  outputUrl?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MarketingVideo {
  id: string;
  companyId: string;
  productId?: string;
  name: string;
  type: MarketingVideoType;
  status: VideoGenerationStatus;
  templateId?: string;
  style?: Record<string, unknown>;
  script?: string;
  voiceoverText?: string;
  callToAction?: string;
  outputUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  generationStartedAt?: string;
  generationCompletedAt?: string;
  generationError?: string;
  creditsUsed?: number;
  customerId?: string;
  interventionId?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    description?: string;
  };
  template?: {
    id: string;
    name: string;
  };
  scenes?: MarketingVideoScene[];
  variants?: MarketingVideoVariant[];
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface MarketingVideoTemplate {
  id: string;
  companyId?: string;
  name: string;
  description?: string;
  type: MarketingVideoType;
  sceneCount: number;
  defaultDuration: number;
  structure: Record<string, unknown>;
  defaultStyle?: Record<string, unknown>;
  scriptTemplate?: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VideoGenerationProgress {
  videoId: string;
  status: VideoGenerationStatus;
  progress: number;
  currentStep: string;
  error?: string;
}

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

export interface ListVideosResponse {
  items: MarketingVideo[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateVideoSceneInput {
  sceneNumber: number;
  duration: number;
  mediaType: SceneMediaType;
  mediaUrl?: string;
  textOverlay?: string;
  textPosition?: string;
  textStyle?: Record<string, unknown>;
  transitionIn?: string;
  transitionOut?: string;
}

export interface CreateMarketingVideoInput {
  name: string;
  type: MarketingVideoType;
  productId?: string;
  templateId?: string;
  style?: Record<string, unknown>;
  script?: string;
  voiceoverText?: string;
  callToAction?: string;
  customerId?: string;
  interventionId?: string;
  scenes?: CreateVideoSceneInput[];
}

export interface UpdateMarketingVideoInput {
  name?: string;
  style?: Record<string, unknown>;
  script?: string;
  voiceoverText?: string;
  callToAction?: string;
  status?: VideoGenerationStatus;
}

export interface GenerateVideoFromProductInput {
  productId: string;
  type?: MarketingVideoType;
  templateId?: string;
  style?: {
    mood?: 'professional' | 'casual' | 'luxury' | 'playful';
    colorScheme?: string;
    musicStyle?: string;
  };
  platforms?: VideoPlatform[];
  customPrompt?: string;
  generateScript?: boolean;
  useAIVoiceover?: boolean;
}

export interface GenerateSceneMediaInput {
  videoId: string;
  sceneNumber: number;
  sourceImageUrl?: string;
  prompt?: string;
  duration?: number;
  aspectRatio?: string;
}

export interface GenerateScriptInput {
  productId: string;
  type: MarketingVideoType;
  targetDuration?: number;
  tone?: string;
  additionalContext?: string;
}

export interface CreateVideoTemplateInput {
  name: string;
  description?: string;
  type: MarketingVideoType;
  sceneCount: number;
  defaultDuration: number;
  structure: Record<string, unknown>;
  defaultStyle?: Record<string, unknown>;
  scriptTemplate?: string;
  isActive?: boolean;
}

export interface UpdateVideoTemplateInput {
  name?: string;
  description?: string;
  type?: MarketingVideoType;
  sceneCount?: number;
  defaultDuration?: number;
  structure?: Record<string, unknown>;
  defaultStyle?: Record<string, unknown>;
  scriptTemplate?: string;
  isActive?: boolean;
}

export interface ListVideosQuery {
  companyId?: string;
  productId?: string;
  type?: MarketingVideoType;
  status?: VideoGenerationStatus;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Marketing Videos API
// ============================================================================

export const marketingVideosApi = {
  // Videos CRUD
  list: async (query: ListVideosQuery = {}): Promise<ListVideosResponse> => {
    const params = new URLSearchParams();
    if (query.companyId) params.set('companyId', query.companyId);
    if (query.productId) params.set('productId', query.productId);
    if (query.type) params.set('type', query.type);
    if (query.status) params.set('status', query.status);
    if (query.limit) params.set('limit', String(query.limit));
    if (query.offset) params.set('offset', String(query.offset));
    const queryString = params.toString();
    return apiRequest.get<ListVideosResponse>(`/api/marketing-videos${queryString ? `?${queryString}` : ''}`);
  },

  get: async (id: string): Promise<MarketingVideo> => {
    return apiRequest.get<MarketingVideo>(`/api/marketing-videos/${id}`);
  },

  getProgress: async (id: string): Promise<VideoGenerationProgress> => {
    return apiRequest.get<VideoGenerationProgress>(`/api/marketing-videos/${id}/progress`);
  },

  create: async (input: CreateMarketingVideoInput, companyId?: string): Promise<MarketingVideo> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<MarketingVideo>(`/api/marketing-videos${params}`, input);
  },

  update: async (id: string, input: UpdateMarketingVideoInput): Promise<MarketingVideo> => {
    return apiRequest.patch<MarketingVideo>(`/api/marketing-videos/${id}`, input);
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/marketing-videos/${id}`);
  },

  // AI Generation
  generateFromProduct: async (
    input: GenerateVideoFromProductInput,
    companyId?: string,
  ): Promise<{ videoId: string; status: VideoGenerationStatus; message: string }> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post(`/api/marketing-videos/generate${params}`, input);
  },

  generateSceneMedia: async (
    input: GenerateSceneMediaInput,
  ): Promise<{ videoUrl: string; duration: number; creditsUsed: number }> => {
    return apiRequest.post(`/api/marketing-videos/generate-scene`, input);
  },

  generateScript: async (input: GenerateScriptInput): Promise<GeneratedScript> => {
    return apiRequest.post<GeneratedScript>(`/api/marketing-videos/generate-script`, input);
  },

  generateVariants: async (
    id: string,
    platforms: VideoPlatform[],
  ): Promise<MarketingVideoVariant[]> => {
    return apiRequest.post<MarketingVideoVariant[]>(`/api/marketing-videos/${id}/variants`, {
      platforms,
    });
  },

  // Templates
  listTemplates: async (companyId?: string): Promise<MarketingVideoTemplate[]> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<MarketingVideoTemplate[]>(`/api/marketing-videos/templates/list${params}`);
  },

  createTemplate: async (
    input: CreateVideoTemplateInput,
    companyId?: string,
  ): Promise<MarketingVideoTemplate> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<MarketingVideoTemplate>(`/api/marketing-videos/templates${params}`, input);
  },

  updateTemplate: async (
    id: string,
    input: UpdateVideoTemplateInput,
  ): Promise<MarketingVideoTemplate> => {
    return apiRequest.patch<MarketingVideoTemplate>(`/api/marketing-videos/templates/${id}`, input);
  },

  deleteTemplate: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/marketing-videos/templates/${id}`);
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

export const VIDEO_TYPE_LABELS: Record<MarketingVideoType, string> = {
  PRODUCT_SHOWCASE: 'Product Showcase',
  PRODUCT_LAUNCH: 'Product Launch',
  SALE_PROMO: 'Sale Promo',
  TESTIMONIAL: 'Testimonial',
  TUTORIAL: 'Tutorial',
  BRAND_STORY: 'Brand Story',
  RETENTION_WINBACK: 'Win-back',
  RETENTION_ANNIVERSARY: 'Anniversary',
  RETENTION_REMINDER: 'Reminder',
  SOCIAL_AD: 'Social Ad',
};

export const VIDEO_STATUS_LABELS: Record<VideoGenerationStatus, string> = {
  PENDING: 'Pending',
  GENERATING_SCRIPT: 'Generating Script',
  GENERATING_MEDIA: 'Generating Media',
  GENERATING_VOICE: 'Generating Voice',
  COMPOSING: 'Composing',
  EXPORTING: 'Exporting',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export const PLATFORM_LABELS: Record<VideoPlatform, string> = {
  TIKTOK: 'TikTok',
  INSTAGRAM_REELS: 'Instagram Reels',
  INSTAGRAM_STORIES: 'Instagram Stories',
  INSTAGRAM_FEED: 'Instagram Feed',
  FACEBOOK_REELS: 'Facebook Reels',
  FACEBOOK_FEED: 'Facebook Feed',
  YOUTUBE_SHORTS: 'YouTube Shorts',
  YOUTUBE: 'YouTube',
  TWITTER: 'Twitter/X',
  LINKEDIN: 'LinkedIn',
};

export function getStatusColor(status: VideoGenerationStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'PENDING':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}
