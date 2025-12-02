import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
export type ReviewSource = 'WEBSITE' | 'EMAIL' | 'API' | 'IMPORT';

export interface ReviewMedia {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnailUrl?: string;
}

export interface Review {
  id: string;
  companyId: string;
  productId: string;
  customerId?: string;
  orderId?: string;

  // Review content
  rating: number; // 1-5
  title?: string;
  content?: string;
  pros: string[];
  cons: string[];

  // Reviewer info
  reviewerName?: string;
  reviewerEmail?: string;
  isVerifiedPurchase: boolean;
  purchaseDate?: string;

  // Status & moderation
  status: ReviewStatus;
  moderatedBy?: string;
  moderatedAt?: string;
  moderationNotes?: string;
  rejectReason?: string;

  // Engagement
  helpfulCount: number;
  unhelpfulCount: number;

  // Merchant response
  merchantResponse?: string;
  merchantRespondedAt?: string;
  merchantRespondedBy?: string;

  // Display options
  isFeatured: boolean;
  isPinned: boolean;

  // Source
  source: ReviewSource;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Relations
  product?: {
    id: string;
    name: string;
    sku: string;
    images?: any;
  };
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  media?: ReviewMedia[];
}

export interface ReviewQueryParams {
  companyId?: string;
  productId?: string;
  customerId?: string;
  status?: ReviewStatus;
  rating?: number;
  isVerifiedPurchase?: boolean;
  isFeatured?: boolean;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface ReviewStats {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  flaggedReviews: number;
  averageRating: number;
  ratingDistribution: {
    rating: number;
    count: number;
    percentage: number;
  }[];
  verifiedPurchaseRate: number;
  responseRate: number;
  averageResponseTime: number | null;
}

export interface ProductReviewSummary {
  productId: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    rating: number;
    count: number;
  }[];
  verifiedReviews: number;
  verifiedAverageRating: number;
  topKeywords: string[];
}

export interface CreateReviewInput {
  productId: string;
  customerId?: string;
  orderId?: string;
  rating: number;
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
  reviewerName?: string;
  reviewerEmail?: string;
  source?: ReviewSource;
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  content?: string;
  pros?: string[];
  cons?: string[];
}

export interface ModerateReviewInput {
  status: ReviewStatus;
  moderationNotes?: string;
  rejectReason?: string;
}

export interface MerchantResponseInput {
  response: string;
}

export interface ReviewConfig {
  id: string | null;
  companyId: string;
  enabled: boolean;
  autoApprove: boolean;
  requireVerifiedPurchase: boolean;
  minRatingForAutoApprove?: number;
  moderationKeywords: string[];
  showVerifiedBadge: boolean;
  showReviewerName: boolean;
  showReviewDate: boolean;
  allowAnonymous: boolean;
  sortDefault: string;
  minReviewLength: number;
  maxReviewLength: number;
  allowMedia: boolean;
  maxMediaPerReview: number;
  allowProsAndCons: boolean;
  sendReviewRequest: boolean;
  reviewRequestDelay: number;
  widgetTheme: string;
  widgetPosition: string;
  widgetPrimaryColor: string;
  widgetCustomCss?: string;
  enableRichSnippets: boolean;
  schemaType: string;
  incentiveEnabled: boolean;
  incentiveType?: string;
  incentiveValue?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateReviewConfigInput {
  enabled?: boolean;
  autoApprove?: boolean;
  requireVerifiedPurchase?: boolean;
  minRatingForAutoApprove?: number;
  moderationKeywords?: string[];
  showVerifiedBadge?: boolean;
  showReviewerName?: boolean;
  showReviewDate?: boolean;
  allowAnonymous?: boolean;
  sortDefault?: string;
  minReviewLength?: number;
  maxReviewLength?: number;
  allowMedia?: boolean;
  maxMediaPerReview?: number;
  allowProsAndCons?: boolean;
  sendReviewRequest?: boolean;
  reviewRequestDelay?: number;
  widgetTheme?: string;
  widgetPrimaryColor?: string;
  enableRichSnippets?: boolean;
  incentiveEnabled?: boolean;
  incentiveType?: string;
  incentiveValue?: string;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const reviewsApi = {
  // List reviews
  list: async (params: ReviewQueryParams = {}): Promise<{ reviews: Review[]; total: number; hasMore: boolean }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ reviews: Review[]; total: number; hasMore: boolean }>(`/api/reviews?${query}`);
  },

  // Get review by ID
  get: async (id: string): Promise<Review> => {
    return apiRequest.get<Review>(`/api/reviews/${id}`);
  },

  // Get review stats
  getStats: async (companyId?: string): Promise<ReviewStats> => {
    const query = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<ReviewStats>(`/api/reviews/stats${query}`);
  },

  // Get product review summary
  getProductSummary: async (productId: string): Promise<ProductReviewSummary> => {
    return apiRequest.get<ProductReviewSummary>(`/api/reviews/products/${productId}/summary`);
  },

  // Create review
  create: async (data: CreateReviewInput, companyId?: string): Promise<Review> => {
    const query = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<Review>(`/api/reviews${query}`, data);
  },

  // Update review
  update: async (id: string, data: UpdateReviewInput): Promise<Review> => {
    return apiRequest.patch<Review>(`/api/reviews/${id}`, data);
  },

  // Moderate review
  moderate: async (id: string, data: ModerateReviewInput): Promise<Review> => {
    return apiRequest.post<Review>(`/api/reviews/${id}/moderate`, data);
  },

  // Add merchant response
  respond: async (id: string, data: MerchantResponseInput): Promise<Review> => {
    return apiRequest.post<Review>(`/api/reviews/${id}/respond`, data);
  },

  // Vote on review
  vote: async (id: string, isHelpful: boolean): Promise<Review> => {
    return apiRequest.post<Review>(`/api/reviews/${id}/vote`, { isHelpful });
  },

  // Toggle featured status
  toggleFeatured: async (id: string): Promise<Review> => {
    return apiRequest.post<Review>(`/api/reviews/${id}/feature`);
  },

  // Delete review
  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest.delete<{ success: boolean }>(`/api/reviews/${id}`);
  },

  // ═══════════════════════════════════════════════════════════════
  // CONFIG ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  // Get config
  getConfig: async (companyId?: string): Promise<ReviewConfig> => {
    const query = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<ReviewConfig>(`/api/reviews/config/current${query}`);
  },

  // Update config
  updateConfig: async (data: UpdateReviewConfigInput, companyId?: string): Promise<ReviewConfig> => {
    const query = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<ReviewConfig>(`/api/reviews/config/current${query}`, data);
  },

  // Get widget embed code
  getEmbedCode: async (companyId?: string, productId?: string): Promise<{ embedCode: string }> => {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    if (productId) params.set('productId', productId);
    return apiRequest.get<{ embedCode: string }>(`/api/reviews/widget/embed?${params}`);
  },

  // Bulk moderate reviews
  bulkModerate: async (ids: string[], status: ReviewStatus, notes?: string): Promise<{ success: number; failed: number }> => {
    return apiRequest.post<{ success: number; failed: number }>('/api/reviews/bulk/moderate', { ids, status, notes });
  },
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getReviewStatusColor(status: ReviewStatus): string {
  const colors: Record<ReviewStatus, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    APPROVED: 'bg-green-500/10 text-green-400 border-green-500/20',
    REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
    FLAGGED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };
  return colors[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
}

export function getReviewStatusLabel(status: ReviewStatus): string {
  const labels: Record<ReviewStatus, string> = {
    PENDING: 'Pending Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    FLAGGED: 'Flagged',
  };
  return labels[status] || status;
}

export function getReviewSourceLabel(source: ReviewSource): string {
  const labels: Record<ReviewSource, string> = {
    WEBSITE: 'Website',
    EMAIL: 'Email',
    API: 'API',
    IMPORT: 'Import',
  };
  return labels[source] || source;
}

export function canModerateReview(review: Review): boolean {
  return review.status === 'PENDING' || review.status === 'FLAGGED';
}

export function canRespondToReview(review: Review): boolean {
  return review.status === 'APPROVED' && !review.merchantResponse;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function getRatingStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
}
