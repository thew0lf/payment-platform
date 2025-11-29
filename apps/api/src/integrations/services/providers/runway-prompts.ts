/**
 * Runway Product Video Prompt Templates
 * Pre-defined prompts optimized for different product types and use cases.
 */

export const RUNWAY_PRODUCT_PROMPTS = {
  // Subtle motion - works for most products
  GENTLE_SHOWCASE:
    'Subtle camera movement, professional lighting, elegant product presentation',

  // Rotation - good for 3D products
  SLOW_ROTATION:
    'Slow 360-degree rotation, studio lighting, white background, product focus',

  // Lifestyle - product in context
  LIFESTYLE:
    'Product in natural environment, warm lighting, lifestyle setting, subtle motion',

  // Dynamic - attention-grabbing
  DYNAMIC:
    'Dynamic camera angles, dramatic lighting, cinematic product reveal',

  // Unboxing feel
  REVEAL: 'Product reveal moment, anticipation, premium unboxing experience',

  // Food/beverage specific
  FOOD_STEAM: 'Steam rising, fresh and appetizing, warm inviting atmosphere',

  // Fashion specific
  FABRIC_FLOW: 'Fabric flowing naturally, elegant draping, soft movement',

  // Tech specific
  TECH_GLOW: 'Subtle screen glow, futuristic lighting, sleek technology showcase',

  // Jewelry specific
  JEWELRY_SPARKLE:
    'Subtle sparkle, elegant rotation, black velvet background, premium feel',

  // Cosmetics specific
  COSMETICS_LUXE:
    'Smooth texture reveal, luxurious presentation, soft focus background',

  // Furniture specific
  FURNITURE_AMBIENT:
    'Gentle ambient lighting, cozy atmosphere, subtle camera drift',

  // Automotive/parts specific
  AUTO_PRECISION:
    'Precision engineering highlight, clean studio shot, smooth rotation',
} as const;

export type RunwayPromptKey = keyof typeof RUNWAY_PRODUCT_PROMPTS;

/**
 * Get prompt by category - suggests best prompt for product type
 */
export function getPromptForCategory(category: string): string {
  const categoryLower = category.toLowerCase();

  if (
    categoryLower.includes('food') ||
    categoryLower.includes('beverage') ||
    categoryLower.includes('coffee') ||
    categoryLower.includes('tea')
  ) {
    return RUNWAY_PRODUCT_PROMPTS.FOOD_STEAM;
  }

  if (
    categoryLower.includes('fashion') ||
    categoryLower.includes('clothing') ||
    categoryLower.includes('apparel')
  ) {
    return RUNWAY_PRODUCT_PROMPTS.FABRIC_FLOW;
  }

  if (
    categoryLower.includes('tech') ||
    categoryLower.includes('electronic') ||
    categoryLower.includes('gadget')
  ) {
    return RUNWAY_PRODUCT_PROMPTS.TECH_GLOW;
  }

  if (
    categoryLower.includes('jewelry') ||
    categoryLower.includes('watch') ||
    categoryLower.includes('accessori')
  ) {
    return RUNWAY_PRODUCT_PROMPTS.JEWELRY_SPARKLE;
  }

  if (
    categoryLower.includes('cosmetic') ||
    categoryLower.includes('beauty') ||
    categoryLower.includes('skincare')
  ) {
    return RUNWAY_PRODUCT_PROMPTS.COSMETICS_LUXE;
  }

  if (
    categoryLower.includes('furniture') ||
    categoryLower.includes('home') ||
    categoryLower.includes('decor')
  ) {
    return RUNWAY_PRODUCT_PROMPTS.FURNITURE_AMBIENT;
  }

  if (
    categoryLower.includes('auto') ||
    categoryLower.includes('car') ||
    categoryLower.includes('vehicle')
  ) {
    return RUNWAY_PRODUCT_PROMPTS.AUTO_PRECISION;
  }

  // Default to gentle showcase for unknown categories
  return RUNWAY_PRODUCT_PROMPTS.GENTLE_SHOWCASE;
}

/**
 * Build a custom prompt with product details
 */
export function buildCustomPrompt(
  basePrompt: string,
  options?: {
    productName?: string;
    style?: 'professional' | 'casual' | 'luxury' | 'playful';
    motion?: 'subtle' | 'moderate' | 'dynamic';
    background?: string;
  },
): string {
  const parts: string[] = [basePrompt];

  if (options?.style) {
    const styleModifiers: Record<string, string> = {
      professional: 'clean and professional aesthetic',
      casual: 'relaxed and approachable feel',
      luxury: 'premium and luxurious presentation',
      playful: 'fun and energetic vibe',
    };
    parts.push(styleModifiers[options.style]);
  }

  if (options?.motion) {
    const motionModifiers: Record<string, string> = {
      subtle: 'minimal movement',
      moderate: 'smooth flowing motion',
      dynamic: 'energetic camera work',
    };
    parts.push(motionModifiers[options.motion]);
  }

  if (options?.background) {
    parts.push(`${options.background} background`);
  }

  return parts.join(', ');
}
