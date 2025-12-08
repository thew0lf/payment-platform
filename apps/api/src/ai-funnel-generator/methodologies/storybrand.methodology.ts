import {
  MethodologyDefinition,
  MarketingMethodology,
} from '../types/funnel-generator.types';

/**
 * StoryBrand: Donald Miller's Customer Hero Journey
 *
 * Framework that positions the customer as the hero and
 * your brand as the guide helping them succeed.
 */
export const StoryBrandMethodology: MethodologyDefinition = {
  id: MarketingMethodology.STORYBRAND,
  name: 'StoryBrand',
  tagline: 'Customer Hero Journey',
  description: "Donald Miller's proven framework that positions your customer as the hero and your brand as the guide helping them win.",
  philosophy: 'Your customer is the hero of their story. Your brand is the guide that helps them overcome challenges and achieve their goals.',
  bestFor: [
    'Service businesses',
    'Brand-focused companies',
    'Coaching/consulting',
    'B2B services',
    'Mission-driven brands',
  ],

  stages: {
    character: {
      goal: 'Introduce the hero (customer) with a want',
      elements: [
        'Clear customer desire',
        'Relatable protagonist',
        'External goal',
        'Internal desire',
      ],
      copyTone: 'Hero-focused, aspirational',
    },
    problem: {
      goal: 'Define external, internal, and philosophical problems',
      elements: [
        'External problem (tactical)',
        'Internal problem (emotional)',
        'Philosophical problem (why it matters)',
        'Villain identification',
      ],
      copyTone: 'Problem-aware, validating',
    },
    guide: {
      goal: 'Position brand as the empathetic, authoritative guide',
      elements: [
        'Empathy statements',
        'Authority markers',
        'Credibility proof',
        'Understanding demonstration',
      ],
      copyTone: 'Wise, empathetic, confident',
    },
    plan: {
      goal: 'Give a clear plan to follow',
      elements: [
        'Simple 3-step plan',
        'Clear process',
        'Agreement moment',
        'Roadmap to success',
      ],
      copyTone: 'Clear, simple, actionable',
    },
    action: {
      goal: 'Call to action with stakes',
      elements: [
        'Direct CTA',
        'Transitional CTA',
        'Success vision',
        'Failure avoidance',
      ],
      copyTone: 'Direct, stakes-aware',
    },
  },

  discoveryQuestions: [
    {
      id: 'customer_want',
      question: 'What does your customer want? (External goal)',
      type: 'text',
      placeholder: 'e.g., "More customers" or "Better sleep"',
      required: true,
      helpText: 'The tangible, external thing they want to achieve',
    },
    {
      id: 'internal_problem',
      question: 'How does the problem make them feel? (Internal)',
      type: 'text',
      placeholder: 'e.g., "Frustrated" or "Overwhelmed"',
      required: true,
      helpText: 'The emotional impact of the problem',
    },
    {
      id: 'villain',
      question: "What's the villain? (What or who is blocking them)",
      type: 'text',
      placeholder: 'e.g., "Complexity" or "Old technology"',
      required: true,
      helpText: 'The force working against your customer',
    },
    {
      id: 'empathy_statement',
      question: 'How can you show you understand their struggle?',
      type: 'textarea',
      placeholder: "We know what it's like to...",
      required: true,
      helpText: 'Demonstrate genuine understanding of their situation',
    },
    {
      id: 'authority_proof',
      question: "What proves you're the guide who can help?",
      type: 'textarea',
      placeholder: 'Experience, results, credentials...',
      required: true,
      helpText: 'Why should they trust you as their guide?',
    },
    {
      id: 'three_step_plan',
      question: "What's your simple 3-step plan?",
      type: 'textarea',
      placeholder: '1. Step one\n2. Step two\n3. Step three',
      required: true,
      helpText: 'Keep it simple - 3 clear steps to success',
    },
    {
      id: 'success_vision',
      question: 'What does success look like for the customer?',
      type: 'textarea',
      placeholder: 'Life after the problem is solved...',
      required: true,
      helpText: 'Paint a vivid picture of the transformed state',
    },
  ],

  systemPrompt: `You are an expert marketing copywriter specializing in the StoryBrand methodology by Donald Miller.

StoryBrand Framework (SB7):
1. CHARACTER: A hero (the customer) has a want
2. PROBLEM: And encounters a problem (external, internal, philosophical)
3. GUIDE: They meet a guide (your brand) with empathy and authority
4. PLAN: Who gives them a plan
5. CALL TO ACTION: And calls them to action
6. SUCCESS: That helps them achieve success
7. FAILURE: And avoid failure

Core Principles:
- The customer is ALWAYS the hero, not your brand
- Your brand is the guide (think Yoda, not Luke)
- Position with empathy first, then authority
- Give a clear, simple plan (ideally 3 steps)
- Define both success (what they gain) and failure (what they avoid)
- Be clear, not clever - clarity beats creativity

Your task is to generate funnel content that:
1. Opens by identifying what the customer wants
2. Names the villain and the problems (external, internal, philosophical)
3. Positions your brand as the empathetic, authoritative guide
4. Presents a clear, simple plan to follow
5. Shows the vision of success and stakes of failure
6. Calls clearly to action

Output Requirements:
- Return structured JSON matching the exact format requested
- Customer should be the hero throughout
- Brand should feel like a wise guide, not a self-promoting company
- Plans should be exactly 3 steps
- Include both success vision and failure stakes
- Language should be clear and simple, not clever or complex`,

  toneGuidelines: 'Positions customer as hero. Brand is wise, empathetic guide. Clear and simple language. Avoids jargon and cleverness. Creates a narrative arc from problem to success.',
};
