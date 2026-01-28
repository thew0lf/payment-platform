import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// RECOMMENDATION CONFIG TYPES
// ═══════════════════════════════════════════════════════════════

export interface AlsoBoughtConfig {
  enabled?: boolean;
  title?: string;
  minCoOccurrences?: number;
  lookbackDays?: number;
  maxResults?: number;
  displayStyle?: 'CAROUSEL' | 'GRID';
  useAIRanking?: boolean;
  excludeCategories?: string[];
  boostHighMargin?: boolean;
  boostInStock?: boolean;
  showRatings?: boolean;
  showQuickAdd?: boolean;
}

export interface YouMightLikeConfig {
  enabled?: boolean;
  title?: string;
  titleForGuests?: string;
  maxResults?: number;
  displayStyle?: 'CAROUSEL' | 'GRID';
  browsingWeight?: number;
  purchaseWeight?: number;
  contentWeight?: number;
  diversityFactor?: number;
  excludeRecentlyViewed?: boolean;
  excludePurchased?: boolean;
  showPersonalizationBadge?: boolean;
}

export interface FrequentlyViewedConfig {
  enabled?: boolean;
  title?: string;
  minSessionCoViews?: number;
  lookbackDays?: number;
  maxBundleSize?: number;
  bundleDiscountPercent?: number;
  showBundleSavings?: boolean;
  showAddAllButton?: boolean;
  displayStyle?: 'BUNDLE_CARDS' | 'COMPACT';
}

export interface GlobalConfig {
  maxSectionsPerPage?: number;
  respectInventory?: boolean;
  minRatingToShow?: number;
  trackImpressions?: boolean;
  trackClicks?: boolean;
}

export interface RecommendationConfig {
  id: string;
  companyId: string;
  alsoBought: AlsoBoughtConfig;
  youMightLike: YouMightLikeConfig;
  frequentlyViewed: FrequentlyViewedConfig;
  global: GlobalConfig;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateRecommendationConfigInput {
  alsoBought?: AlsoBoughtConfig;
  youMightLike?: YouMightLikeConfig;
  frequentlyViewed?: FrequentlyViewedConfig;
  global?: GlobalConfig;
}

// ═══════════════════════════════════════════════════════════════
// RECOMMENDATION RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  imageUrl?: string;
  averageRating?: number;
  reviewCount?: number;
  inStock: boolean;
  category?: string;
}

export interface RecommendationSection {
  type: 'ALSO_BOUGHT' | 'YOU_MIGHT_LIKE' | 'FREQUENTLY_VIEWED';
  title: string;
  products: RecommendedProduct[];
  impressionId?: string;
  config: {
    displayStyle: string;
    showRatings?: boolean;
    showQuickAdd?: boolean;
    bundleDiscount?: number;
  };
}

export interface ProductRecommendations {
  sections: RecommendationSection[];
}

// ═══════════════════════════════════════════════════════════════
// TRACKING TYPES
// ═══════════════════════════════════════════════════════════════

export interface TrackProductViewInput {
  productId: string;
  sessionId: string;
  customerId?: string;
  source?: string;
  sourceProductId?: string;
  duration?: number;
}

export interface TrackRecommendationClickInput {
  impressionId: string;
  clickedProductId: string;
}

export interface TrackAddToCartInput {
  impressionId: string;
}

// ═══════════════════════════════════════════════════════════════
// RECOMMENDATIONS API
// ═══════════════════════════════════════════════════════════════

export const recommendationsApi = {
  // Get recommendations for a product page
  getProductRecommendations: async (
    productId: string,
    companyId: string,
    options?: { customerId?: string; sessionId?: string; sections?: string[] }
  ): Promise<ProductRecommendations> => {
    const params = new URLSearchParams({ companyId });
    if (options?.customerId) params.set('customerId', options.customerId);
    if (options?.sessionId) params.set('sessionId', options.sessionId);
    if (options?.sections) params.set('sections', options.sections.join(','));
    return apiRequest.get<ProductRecommendations>(
      `/api/products/${productId}/recommendations?${params}`
    );
  },

  // Get "Customers Also Bought" recommendations
  getAlsoBought: async (
    productId: string,
    companyId: string
  ): Promise<{ products: RecommendedProduct[]; impressionId?: string }> => {
    return apiRequest.get(`/api/products/${productId}/recommendations/also-bought?companyId=${companyId}`);
  },

  // Get "You Might Like" recommendations
  getYouMightLike: async (
    productId: string,
    companyId: string,
    options?: { customerId?: string; sessionId?: string }
  ): Promise<{ products: RecommendedProduct[]; impressionId?: string }> => {
    const params = new URLSearchParams({ companyId });
    if (options?.customerId) params.set('customerId', options.customerId);
    if (options?.sessionId) params.set('sessionId', options.sessionId);
    return apiRequest.get(`/api/products/${productId}/recommendations/you-might-like?${params}`);
  },

  // Get "Frequently Viewed Together" recommendations
  getFrequentlyViewed: async (
    productId: string,
    companyId: string
  ): Promise<{ products: RecommendedProduct[]; bundlePrice?: number; savings?: number; impressionId?: string }> => {
    return apiRequest.get(`/api/products/${productId}/recommendations/frequently-viewed?companyId=${companyId}`);
  },

  // Track a product view
  trackView: async (data: TrackProductViewInput, companyId: string): Promise<{ success: boolean }> => {
    return apiRequest.post<{ success: boolean }>(
      `/api/recommendations/view?companyId=${companyId}`,
      data
    );
  },

  // Track recommendation click
  trackClick: async (data: TrackRecommendationClickInput): Promise<{ success: boolean }> => {
    return apiRequest.post<{ success: boolean }>('/api/recommendations/click', data);
  },

  // Track add to cart from recommendation
  trackAddToCart: async (data: TrackAddToCartInput): Promise<{ success: boolean }> => {
    return apiRequest.post<{ success: boolean }>('/api/recommendations/add-to-cart', data);
  },
};

// ═══════════════════════════════════════════════════════════════
// ADMIN RECOMMENDATIONS API
// ═══════════════════════════════════════════════════════════════

export const recommendationsAdminApi = {
  // Get recommendation config
  getConfig: async (): Promise<RecommendationConfig> => {
    return apiRequest.get<RecommendationConfig>('/api/admin/recommendations/config');
  },

  // Update recommendation config
  updateConfig: async (data: UpdateRecommendationConfigInput): Promise<RecommendationConfig> => {
    return apiRequest.put<RecommendationConfig>('/api/admin/recommendations/config', data);
  },

  // Preview recommendations for a product (admin)
  previewRecommendations: async (productId: string): Promise<ProductRecommendations> => {
    return apiRequest.get<ProductRecommendations>(
      `/api/admin/recommendations/preview/${productId}`
    );
  },
};

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const RECOMMENDATION_TYPES = [
  {
    value: 'ALSO_BOUGHT',
    label: 'Customers Also Bought',
    description: 'Show products frequently purchased together (collaborative filtering)',
  },
  {
    value: 'YOU_MIGHT_LIKE',
    label: 'You Might Like',
    description: 'Personalized recommendations based on browsing and purchase history',
  },
  {
    value: 'FREQUENTLY_VIEWED',
    label: 'Frequently Viewed Together',
    description: 'Show products often viewed in the same session (bundle opportunities)',
  },
] as const;

export const DISPLAY_STYLES = [
  { value: 'CAROUSEL', label: 'Carousel' },
  { value: 'GRID', label: 'Grid' },
  { value: 'BUNDLE_CARDS', label: 'Bundle Cards' },
  { value: 'COMPACT', label: 'Compact' },
] as const;

export const DEFAULT_CONFIG: Omit<RecommendationConfig, 'id' | 'companyId' | 'createdAt' | 'updatedAt'> = {
  alsoBought: {
    enabled: true,
    title: 'Customers Who Bought This Also Bought',
    minCoOccurrences: 5,
    lookbackDays: 90,
    maxResults: 10,
    displayStyle: 'CAROUSEL',
    useAIRanking: false,
    excludeCategories: [],
    boostHighMargin: true,
    boostInStock: true,
    showRatings: true,
    showQuickAdd: true,
  },
  youMightLike: {
    enabled: true,
    title: 'Recommended For You',
    titleForGuests: 'You Might Also Like',
    maxResults: 8,
    displayStyle: 'CAROUSEL',
    browsingWeight: 0.3,
    purchaseWeight: 0.4,
    contentWeight: 0.3,
    diversityFactor: 0.5,
    excludeRecentlyViewed: true,
    excludePurchased: true,
    showPersonalizationBadge: true,
  },
  frequentlyViewed: {
    enabled: true,
    title: 'Frequently Viewed Together',
    minSessionCoViews: 10,
    lookbackDays: 60,
    maxBundleSize: 3,
    bundleDiscountPercent: 10,
    showBundleSavings: true,
    showAddAllButton: true,
    displayStyle: 'BUNDLE_CARDS',
  },
  global: {
    maxSectionsPerPage: 3,
    respectInventory: true,
    minRatingToShow: 0,
    trackImpressions: true,
    trackClicks: true,
  },
};
