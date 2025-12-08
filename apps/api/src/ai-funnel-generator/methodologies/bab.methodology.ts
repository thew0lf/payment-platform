import {
  MethodologyDefinition,
  MarketingMethodology,
} from '../types/funnel-generator.types';

/**
 * BAB: Before, After, Bridge
 *
 * Transformation-focused framework that contrasts the
 * current state with the desired state.
 */
export const BABMethodology: MethodologyDefinition = {
  id: MarketingMethodology.BAB,
  name: 'BAB',
  tagline: 'Transformation Stories',
  description: 'Simple but powerful framework that shows the before and after, with your product as the bridge to transformation.',
  philosophy: 'Show the transformation clearly. Help customers see themselves in the before and desire the after.',
  bestFor: [
    'Coaching',
    'Fitness & health',
    'Personal development',
    'Lifestyle changes',
    'Before/after products',
  ],

  stages: {
    before: {
      goal: 'Paint the current painful reality',
      elements: [
        'Current state description',
        'Daily frustrations',
        'Relatable struggles',
        'Emotional weight',
      ],
      copyTone: 'Empathetic, relatable, honest',
    },
    after: {
      goal: 'Show the transformed future state',
      elements: [
        'Desired outcome',
        'Life improvements',
        'Emotional benefits',
        'Specific changes',
      ],
      copyTone: 'Aspirational, vivid, specific',
    },
    bridge: {
      goal: 'Present product as the path from before to after',
      elements: [
        'How product enables transformation',
        'Simple process',
        'Proof it works',
        'Risk-free path',
      ],
      copyTone: 'Confident, enabling, supportive',
    },
  },

  discoveryQuestions: [
    {
      id: 'before_state',
      question: "Describe your customer's 'before' state - their current reality",
      type: 'textarea',
      placeholder: 'Their daily struggles, frustrations, what they deal with...',
      required: true,
      helpText: 'Be specific and emotional - what is life like now?',
    },
    {
      id: 'after_state',
      question: "Describe the 'after' state - life after using your product",
      type: 'textarea',
      placeholder: "What's different? How do they feel? What can they do now?",
      required: true,
      helpText: 'Paint a vivid picture of the transformation',
    },
    {
      id: 'transformation_story',
      question: 'Share a real transformation story or testimonial',
      type: 'textarea',
      placeholder: 'A specific customer result or case study...',
      required: false,
      helpText: 'Real stories are more powerful than generic claims',
    },
    {
      id: 'how_it_works',
      question: 'How does your product create this transformation?',
      type: 'textarea',
      placeholder: 'The mechanism or process that makes it work...',
      required: true,
      helpText: 'Simple explanation of how you bridge before to after',
    },
    {
      id: 'time_to_results',
      question: 'How quickly can customers expect results?',
      type: 'text',
      placeholder: 'e.g., "Within 30 days" or "First week"',
      required: false,
      helpText: 'Be honest about realistic timelines',
    },
  ],

  systemPrompt: `You are an expert marketing copywriter specializing in the BAB (Before, After, Bridge) methodology.

BAB Framework:
1. BEFORE: Paint a vivid picture of the customer's current painful reality
2. AFTER: Show the transformed future state they desire
3. BRIDGE: Position your product as the path from before to after

Core Principles:
- Make the before state relatable and specific
- Make the after state desirable and achievable
- The contrast between before and after should be compelling
- The bridge should feel achievable and low-risk
- Use specific details, not vague promises
- Include real transformation stories when possible

Your task is to generate funnel content that:
1. Opens with a relatable before state that creates recognition
2. Transitions to a vivid after state that creates desire
3. Presents the product as the clear bridge to transformation
4. Includes proof through stories and results
5. Makes taking action feel like the obvious next step

Output Requirements:
- Return structured JSON matching the exact format requested
- Before section should feel relatable, not depressing
- After section should feel achievable, not fantasy
- Bridge should feel logical and supportive
- Use specific details and stories over generic claims
- Copy should create emotional resonance around transformation`,

  toneGuidelines: 'Empathetic and understanding in before. Aspirational and vivid in after. Supportive and enabling in bridge. Transformation-focused throughout. Real and honest, not hype-driven.',
};
