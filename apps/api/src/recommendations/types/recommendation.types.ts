// Product Recommendation Types
// Defines interfaces for Amazon-style recommendations

// =============================================================================
// RECOMMENDATION ALGORITHM TYPES
// =============================================================================

export interface AlsoBoughtConfig {
  enabled: boolean;
  title: string;
  minCoOccurrences: number; // Default: 5
  lookbackDays: number; // Default: 90
  maxResults: number; // Default: 10
  displayStyle: 'CAROUSEL' | 'GRID';
  useAIRanking: boolean;
  excludeCategories: string[];
  boostHighMargin: boolean;
  boostInStock: boolean;
  showRatings: boolean;
  showQuickAdd: boolean;
}

export interface YouMightLikeConfig {
  enabled: boolean;
  title: string;
  titleForGuests: string;
  maxResults: number;
  displayStyle: 'CAROUSEL' | 'GRID';
  browsingWeight: number; // 0-1
  purchaseWeight: number; // 0-1
  contentWeight: number; // 0-1
  diversityFactor: number; // 0-1
  excludeRecentlyViewed: boolean;
  excludePurchased: boolean;
  showPersonalizationBadge: boolean;
}

export interface FrequentlyViewedConfig {
  enabled: boolean;
  title: string;
  minSessionCoViews: number; // Default: 10
  lookbackDays: number;
  maxBundleSize: number; // Default: 3
  bundleDiscountPercent: number; // Default: 10
  showBundleSavings: boolean;
  showAddAllButton: boolean;
  displayStyle: 'BUNDLE_CARDS' | 'COMPACT';
}

export interface GlobalRecommendationConfig {
  maxSectionsPerPage: number; // Default: 3
  respectInventory: boolean; // Hide out-of-stock
  minRatingToShow: number; // Default: 0 (show all)
  trackImpressions: boolean;
  trackClicks: boolean;
}

export interface RecommendationConfigData {
  companyId: string;
  alsoBought: AlsoBoughtConfig;
  youMightLike: YouMightLikeConfig;
  frequentlyViewed: FrequentlyViewedConfig;
  global: GlobalRecommendationConfig;
}

// =============================================================================
// PRODUCT TYPES
// =============================================================================

export interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  rating?: number;
  reviewCount?: number;
  inStock: boolean;
  category?: string;
  coOccurrenceCount?: number; // For also-bought
  similarityScore?: number; // For you-might-like
}

// =============================================================================
// RECOMMENDATION SECTION TYPES
// =============================================================================

export type RecommendationType = 'ALSO_BOUGHT' | 'YOU_MIGHT_LIKE' | 'FREQUENTLY_VIEWED';

export interface RecommendationSection {
  type: RecommendationType;
  title: string;
  subtitle?: string;
  products: RecommendedProduct[];
  displayStyle: 'CAROUSEL' | 'GRID';
  personalized?: boolean;
}

export interface ViewedTogetherBundle {
  products: RecommendedProduct[];
  coViewFrequency: number;
  conversionLift: number;
  individualTotal: number;
  bundlePrice: number;
  savings: number;
  discountPercent: number;
}

export interface FrequentlyViewedSection {
  type: 'FREQUENTLY_VIEWED';
  title: string;
  subtitle?: string;
  currentProduct: RecommendedProduct;
  bundles: ViewedTogetherBundle[];
  displayStyle: 'BUNDLE_CARDS' | 'COMPACT';
}

export interface ProductPageRecommendations {
  alsoBought: RecommendationSection | null;
  youMightLike: RecommendationSection | null;
  frequentlyViewed: FrequentlyViewedSection | null;
}

// =============================================================================
// CUSTOMER SIGNALS TYPES
// =============================================================================

export interface CustomerSignals {
  // Browsing behavior
  viewedProducts: { productId: string; viewCount: number; lastViewed: Date }[];
  viewedCategories: { categoryId: string; viewCount: number }[];
  searchTerms: string[];
  avgTimeOnProduct: number;

  // Purchase behavior
  purchasedProducts: {
    productId: string;
    purchaseCount: number;
    lastPurchased: Date;
  }[];
  purchasedCategories: { categoryId: string; purchaseCount: number }[];
  avgOrderValue: number;
  pricePreference: 'budget' | 'mid' | 'premium';

  // Engagement
  wishlistItems: string[];
  cartAbandons: string[];
  reviewedProducts: string[];
}

// =============================================================================
// TRACKING TYPES
// =============================================================================

export interface RecommendationImpressionData {
  companyId: string;
  productId: string;
  type: RecommendationType;
  sessionId: string;
  customerId?: string;
  recommendedIds: string[];
}

export interface RecommendationClickData {
  impressionId: string;
  clickedProductId: string;
}

export interface RecommendationAddToCartData {
  impressionId: string;
  clickedProductId: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface RecommendationAnalytics {
  type: RecommendationType;
  impressions: number;
  clicks: number;
  clickRate: number;
  addToCarts: number;
  addToCartRate: number;
  revenue: number;
  topPerformingProducts: {
    productId: string;
    productName: string;
    clicks: number;
    addToCarts: number;
  }[];
}
