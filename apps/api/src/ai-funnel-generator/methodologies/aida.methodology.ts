import {
  MethodologyDefinition,
  MarketingMethodology,
} from '../types/funnel-generator.types';

/**
 * AIDA: Attention, Interest, Desire, Action
 *
 * Classic direct response marketing framework that guides
 * prospects through a logical sequence from awareness to action.
 */
export const AIDAMethodology: MethodologyDefinition = {
  id: MarketingMethodology.AIDA,
  name: 'AIDA',
  tagline: 'Classic Direct Response',
  description: 'Time-tested formula that guides customers from attention to action in a logical, proven sequence.',
  philosophy: 'Guide prospects through a natural progression from awareness to action, building engagement at each step.',
  bestFor: [
    'Simple products',
    'Wide appeal products',
    'Impulse purchases',
    'E-commerce products',
    'Clear value propositions',
  ],

  stages: {
    attention: {
      goal: 'Stop the scroll, capture immediate attention',
      elements: [
        'Bold, specific headline',
        'Striking visual',
        'Pattern interrupt',
        'Curiosity hook',
      ],
      copyTone: 'Bold, attention-grabbing, specific',
    },
    interest: {
      goal: 'Build curiosity and engagement',
      elements: [
        'Problem identification',
        'Story opening',
        'Surprising fact or statistic',
        'Relatable scenario',
      ],
      copyTone: 'Engaging, relatable, informative',
    },
    desire: {
      goal: 'Create emotional want for the product',
      elements: [
        'Benefits over features',
        'Social proof',
        'Visualization of results',
        'Emotional connection',
      ],
      copyTone: 'Emotional, aspirational, benefit-focused',
    },
    action: {
      goal: 'Drive immediate response',
      elements: [
        'Clear CTA',
        'Urgency element',
        'Risk reversal',
        'Easy next step',
      ],
      copyTone: 'Direct, urgent, confident',
    },
  },

  discoveryQuestions: [
    {
      id: 'attention_grabber',
      question: "What's the most attention-grabbing fact about your product?",
      type: 'text',
      placeholder: 'e.g., "Saves 2 hours per day" or "Used by 50,000+ professionals"',
      required: true,
      helpText: 'The one thing that would make someone stop scrolling',
    },
    {
      id: 'main_problem',
      question: 'What main problem does your product solve?',
      type: 'textarea',
      placeholder: 'Describe the problem your customers face...',
      required: true,
      helpText: 'Be specific about the pain point',
    },
    {
      id: 'key_benefit',
      question: "What's the #1 benefit customers get?",
      type: 'text',
      placeholder: 'The single most important outcome...',
      required: true,
      helpText: 'Focus on the transformation or result, not the product feature',
    },
    {
      id: 'social_proof',
      question: 'What social proof can you share? (testimonials, numbers, press)',
      type: 'textarea',
      placeholder: 'e.g., "Sarah M. lost 30 lbs" or "Featured in TechCrunch"',
      required: false,
      helpText: 'Real results and credibility markers',
    },
    {
      id: 'call_to_action',
      question: "What's your primary call-to-action?",
      type: 'text',
      placeholder: 'e.g., "Start Free Trial" or "Buy Now"',
      required: true,
      helpText: 'The main action you want visitors to take',
    },
  ],

  systemPrompt: `You are an expert marketing copywriter specializing in the AIDA (Attention, Interest, Desire, Action) methodology.

AIDA Framework:
1. ATTENTION: Grab attention with a bold, specific claim or visual hook
2. INTEREST: Build engagement by identifying problems and creating curiosity
3. DESIRE: Create emotional want through benefits and social proof
4. ACTION: Drive immediate response with clear CTA and urgency

Core Principles:
- Start with the most compelling fact or statistic
- Make the problem real and relatable
- Focus on benefits, not features
- Use specific numbers and results
- Create a clear, single call-to-action
- Include risk reversal to reduce friction

Your task is to generate funnel content that:
1. Opens with an attention-grabbing headline using specific claims
2. Builds interest by exploring the problem and creating curiosity
3. Creates desire through benefit-focused copy and social proof
4. Drives action with clear CTAs and urgency elements

Output Requirements:
- Return structured JSON matching the exact format requested
- Headlines should be specific with numbers when possible
- Copy should be scannable with short paragraphs
- Benefits should be outcome-focused ("Get X" not "Has Y feature")
- Include specific proof points and testimonials where provided
- CTAs should be action verbs with clear value proposition`,

  toneGuidelines: 'Clear and direct. Benefit-focused and specific. Uses numbers and concrete results. Creates a logical flow from problem to solution. Professional but accessible.',
};
