import {
  MethodologyDefinition,
  MarketingMethodology,
} from '../types/funnel-generator.types';

/**
 * NCI: Non-Verbal Communication Influence
 *
 * Proprietary methodology that engineers emotional reality before logic.
 * Creates psychologically-optimized funnels through:
 * 1. Engineered Reality - Create desired emotional state first
 * 2. Identity Bridge - Connect product to aspirational self-image
 * 3. Unconscious Agreement - Build micro-commitments before the ask
 * 4. Frictionless Action - Make buying feel inevitable
 */
export const NCIMethodology: MethodologyDefinition = {
  id: MarketingMethodology.NCI,
  name: 'NCI: Non-Verbal Communication Influence',
  tagline: 'Engineered Reality Marketing',
  description: 'Our proprietary framework that engineers emotional reality before presenting logic. Creates psychologically-optimized funnels that feel natural and compelling.',
  philosophy: 'Engineer the emotional reality before presenting logic. Make purchasing feel inevitable, not decided.',
  bestFor: [
    'Premium products',
    'High-ticket items',
    'Lifestyle brands',
    'Transformation products',
    'Luxury goods',
  ],

  stages: {
    reality: {
      goal: 'Create desired emotional state before any selling',
      elements: [
        'Visual hierarchy directing attention',
        'Color psychology triggering emotions',
        'Micro-animations building engagement',
        'Strategic white space creating luxury',
        'Aspirational imagery setting tone',
      ],
      copyTone: 'Confident, assumptive, exclusive',
    },
    identity: {
      goal: 'Connect product to aspirational self-image',
      elements: [
        'Transformation language ("Become...")',
        'Aspirational imagery',
        'Tribal belonging signals',
        'Status indicators',
        'Future-pacing language',
      ],
      copyTone: 'You-focused, future-pacing, empowering',
    },
    agreement: {
      goal: 'Create micro-commitments before the ask',
      elements: [
        'Yes-ladder questions',
        'Strategically timed social proof',
        'Scarcity with logical justification',
        'Authority positioning',
        'Pattern interrupts',
      ],
      copyTone: 'Assumptive, choice-based, confident',
    },
    action: {
      goal: 'Make buying feel inevitable, not decided',
      elements: [
        'Simplified choices',
        'Smart defaults',
        'Progress indicators',
        'Momentum building',
        'Risk reversal',
      ],
      copyTone: 'Direct, simple, action-oriented',
    },
  },

  discoveryQuestions: [
    {
      id: 'initial_emotion',
      question: 'What emotion should visitors feel within the first 3 seconds?',
      type: 'select',
      options: [
        'Excitement - energized and eager',
        'Curiosity - intrigued and wanting more',
        'Relief - finally found the solution',
        'Desire - wanting what they see',
        'Urgency - need to act now',
        'Trust - safe and confident',
      ],
      required: true,
      helpText: 'This emotion will drive the visual and copy tone of your landing page',
    },
    {
      id: 'transformation',
      question: 'Who does your customer want to become? (identity, not demographics)',
      type: 'textarea',
      placeholder: 'e.g., "A confident leader who commands respect" or "A devoted parent who provides the best for their family"',
      required: true,
      helpText: 'Focus on the aspirational identity, not job titles or age groups',
    },
    {
      id: 'current_pain',
      question: 'Describe the moment your customer realizes they need this product',
      type: 'textarea',
      placeholder: 'The specific situation, feeling, or trigger moment...',
      required: true,
      helpText: 'Be specific - what are they doing, feeling, thinking in that moment?',
    },
    {
      id: 'main_objection',
      question: "What's the single biggest objection that kills sales?",
      type: 'text',
      placeholder: 'e.g., "It\'s too expensive" or "I don\'t have time"',
      required: true,
      helpText: 'The one thing that stops people from buying even when interested',
    },
    {
      id: 'credibility_proof',
      question: 'What proof creates instant credibility for your brand?',
      type: 'text',
      placeholder: 'e.g., "10,000+ customers" or "Featured in Forbes" or "20 years experience"',
      required: true,
      helpText: 'The single most powerful proof point you have',
    },
    {
      id: 'unique_mechanism',
      question: 'What makes your solution different from everything else they\'ve tried?',
      type: 'textarea',
      placeholder: 'e.g., "Our patented 3-step system" or "Direct from artisan makers"',
      required: false,
      helpText: 'The unique mechanism or approach that sets you apart',
    },
    {
      id: 'urgency_reason',
      question: 'Is there a legitimate reason for urgency? (Optional)',
      type: 'text',
      placeholder: 'e.g., "Limited batch production" or "Price increase coming"',
      required: false,
      helpText: 'Only include if genuine - fake urgency damages trust',
    },
  ],

  systemPrompt: `You are an expert marketing copywriter specializing in the NCI (Non-Verbal Communication Influence) methodology.

NCI Philosophy: Engineer the emotional reality before presenting logic. Make purchasing feel inevitable, not decided.

The Four NCI Stages:
1. REALITY: Create the desired emotional state before any selling begins
2. IDENTITY: Connect the product to the customer's aspirational self-image
3. AGREEMENT: Build micro-commitments through yes-ladder techniques
4. ACTION: Make the purchase feel like the natural next step

Core Principles:
- Lead with emotion, support with logic
- Speak to the future self, not the current situation
- Use assumptive language that presumes the sale
- Create exclusivity without arrogance
- Build momentum through small agreements
- Remove friction, don't add pressure

Your task is to generate funnel content that:
1. Creates an immediate emotional state matching the desired feeling
2. Bridges to the customer's aspirational identity using transformation language
3. Builds unconscious agreement through micro-commitments and proof
4. Makes the purchase feel inevitable through simplified choices and momentum

Output Requirements:
- Return structured JSON matching the exact format requested
- All copy should be compelling, specific, and free of clichés
- Headlines should be 6-12 words maximum
- Subheadlines should expand on the headline emotion
- Bullet points should be benefit-focused, not feature-focused
- CTAs should be action-oriented and assumptive ("Get Started" not "Submit")
- Never use words like "best", "amazing", "incredible" - be specific instead
- Address the main objection naturally within the copy`,

  toneGuidelines: 'Confident and assumptive without being pushy. Exclusive without being arrogant. Direct but warm. Future-focused and transformational. Speaks to who the customer wants to become, not who they are now.',
};
