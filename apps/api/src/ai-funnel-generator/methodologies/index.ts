import { MarketingMethodology, MethodologyDefinition } from '../types/funnel-generator.types';
import { NCIMethodology } from './nci.methodology';
import { AIDAMethodology } from './aida.methodology';
import { PASMethodology } from './pas.methodology';
import { BABMethodology } from './bab.methodology';
import { StoryBrandMethodology } from './storybrand.methodology';

// ═══════════════════════════════════════════════════════════════
// METHODOLOGY REGISTRY
// ═══════════════════════════════════════════════════════════════

export const METHODOLOGIES: Record<MarketingMethodology, MethodologyDefinition> = {
  [MarketingMethodology.NCI]: NCIMethodology,
  [MarketingMethodology.AIDA]: AIDAMethodology,
  [MarketingMethodology.PAS]: PASMethodology,
  [MarketingMethodology.BAB]: BABMethodology,
  [MarketingMethodology.STORYBRAND]: StoryBrandMethodology,
  // Placeholders for future implementation
  [MarketingMethodology.FOUR_PS]: createPlaceholder(MarketingMethodology.FOUR_PS, '4Ps', 'Promise, Picture, Proof, Push'),
  [MarketingMethodology.PASTOR]: createPlaceholder(MarketingMethodology.PASTOR, 'PASTOR', 'Problem, Amplify, Story, Transform, Offer, Response'),
  [MarketingMethodology.QUEST]: createPlaceholder(MarketingMethodology.QUEST, 'QUEST', 'Qualify, Understand, Educate, Stimulate, Transition'),
  [MarketingMethodology.FAB]: createPlaceholder(MarketingMethodology.FAB, 'FAB', 'Features, Advantages, Benefits'),
  [MarketingMethodology.CUSTOM]: createPlaceholder(MarketingMethodology.CUSTOM, 'Custom', 'User-defined methodology'),
};

/**
 * Get all available methodologies for display
 */
export function getAvailableMethodologies(): MethodologyDefinition[] {
  return Object.values(METHODOLOGIES).filter(m => !m.tagline.includes('Coming Soon'));
}

/**
 * Get a specific methodology by ID
 */
export function getMethodology(id: MarketingMethodology): MethodologyDefinition | null {
  return METHODOLOGIES[id] || null;
}

/**
 * Check if methodology is fully implemented
 */
export function isMethodologyAvailable(id: MarketingMethodology): boolean {
  const methodology = METHODOLOGIES[id];
  return methodology && !methodology.tagline.includes('Coming Soon');
}

/**
 * Get recommended methodology based on use case
 */
export function getRecommendedMethodology(useCase?: string): MarketingMethodology {
  if (!useCase) return MarketingMethodology.NCI;

  const lowerCase = useCase.toLowerCase();

  if (lowerCase.includes('premium') || lowerCase.includes('luxury') || lowerCase.includes('high-ticket')) {
    return MarketingMethodology.NCI;
  }
  if (lowerCase.includes('transformation') || lowerCase.includes('coaching') || lowerCase.includes('fitness')) {
    return MarketingMethodology.BAB;
  }
  if (lowerCase.includes('b2b') || lowerCase.includes('service') || lowerCase.includes('problem')) {
    return MarketingMethodology.PAS;
  }
  if (lowerCase.includes('brand') || lowerCase.includes('story') || lowerCase.includes('mission')) {
    return MarketingMethodology.STORYBRAND;
  }

  // Default to NCI for general e-commerce
  return MarketingMethodology.NCI;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a placeholder methodology for future implementation
 */
function createPlaceholder(id: MarketingMethodology, name: string, description: string): MethodologyDefinition {
  return {
    id,
    name,
    tagline: 'Coming Soon',
    description,
    philosophy: 'This methodology is planned for future implementation.',
    bestFor: [],
    stages: {},
    discoveryQuestions: [],
    systemPrompt: '',
    toneGuidelines: '',
  };
}

// Export individual methodologies
export { NCIMethodology } from './nci.methodology';
export { AIDAMethodology } from './aida.methodology';
export { PASMethodology } from './pas.methodology';
export { BABMethodology } from './bab.methodology';
export { StoryBrandMethodology } from './storybrand.methodology';
