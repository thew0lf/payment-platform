/**
 * Plan utilities for checking subscription features
 */

// Pro+ plans that have access to AI features
const PRO_PLUS_PLANS = ['STANDARD', 'PREMIUM', 'ENTERPRISE', 'FOUNDERS'];

/**
 * Check if a plan has access to Pro+ features (AI generation, etc.)
 * Pro+ includes: STANDARD, PREMIUM, ENTERPRISE, and FOUNDERS (early adopters)
 */
export function hasProPlusPlan(plan: string | undefined | null): boolean {
  if (!plan) return false;
  return PRO_PLUS_PLANS.includes(plan.toUpperCase());
}

/**
 * Check if a plan has access to a specific feature tier
 */
export function hasPlanFeature(plan: string | undefined | null, feature: 'ai' | 'advanced' | 'enterprise'): boolean {
  if (!plan) return false;
  const upperPlan = plan.toUpperCase();

  switch (feature) {
    case 'ai':
      // AI features available for Pro+ plans
      return PRO_PLUS_PLANS.includes(upperPlan);
    case 'advanced':
      // Advanced features for PREMIUM and ENTERPRISE
      return ['PREMIUM', 'ENTERPRISE', 'FOUNDERS'].includes(upperPlan);
    case 'enterprise':
      // Enterprise-only features
      return upperPlan === 'ENTERPRISE';
    default:
      return false;
  }
}

/**
 * Get feature limits based on plan
 */
export function getPlanLimits(plan: string | undefined | null): {
  aiGenerationsPerMonth: number;
  canUseAI: boolean;
  canUseBulkOperations: boolean;
} {
  if (!plan) {
    return {
      aiGenerationsPerMonth: 0,
      canUseAI: false,
      canUseBulkOperations: false,
    };
  }

  const upperPlan = plan.toUpperCase();

  switch (upperPlan) {
    case 'ENTERPRISE':
      return {
        aiGenerationsPerMonth: Infinity,
        canUseAI: true,
        canUseBulkOperations: true,
      };
    case 'PREMIUM':
    case 'FOUNDERS':
      return {
        aiGenerationsPerMonth: 500,
        canUseAI: true,
        canUseBulkOperations: true,
      };
    case 'STANDARD':
      return {
        aiGenerationsPerMonth: 100,
        canUseAI: true,
        canUseBulkOperations: true,
      };
    case 'BASIC':
      return {
        aiGenerationsPerMonth: 10,
        canUseAI: false,
        canUseBulkOperations: false,
      };
    default:
      return {
        aiGenerationsPerMonth: 0,
        canUseAI: false,
        canUseBulkOperations: false,
      };
  }
}
