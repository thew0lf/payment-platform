import {
  MethodologyDefinition,
  MarketingMethodology,
} from '../types/funnel-generator.types';

/**
 * PAS: Problem, Agitation, Solution
 *
 * Pain-focused selling framework that amplifies the problem
 * before presenting the solution.
 */
export const PASMethodology: MethodologyDefinition = {
  id: MarketingMethodology.PAS,
  name: 'PAS',
  tagline: 'Problem-Focused Selling',
  description: 'Powerful framework that deeply connects with customer pain points before presenting your solution.',
  philosophy: 'People are more motivated by avoiding pain than gaining pleasure. Make the problem real, then offer relief.',
  bestFor: [
    'B2B solutions',
    'Service businesses',
    'Problem-solving products',
    'Health & wellness',
    'Productivity tools',
  ],

  stages: {
    problem: {
      goal: 'Identify and validate the problem',
      elements: [
        'Specific problem statement',
        'Relatable scenario',
        'Problem acknowledgment',
        'Empathy demonstration',
      ],
      copyTone: 'Empathetic, understanding, validating',
    },
    agitation: {
      goal: 'Amplify the pain of not solving the problem',
      elements: [
        'Consequences of inaction',
        'Emotional impact',
        'Hidden costs',
        'Compounding effects',
      ],
      copyTone: 'Urgent, emotional, consequence-focused',
    },
    solution: {
      goal: 'Present product as the clear solution',
      elements: [
        'Product as relief',
        'How it works simply',
        'Proof it works',
        'Easy path forward',
      ],
      copyTone: 'Relieving, confident, solution-focused',
    },
  },

  discoveryQuestions: [
    {
      id: 'core_problem',
      question: 'What specific problem does your product solve?',
      type: 'textarea',
      placeholder: 'Describe the exact pain point or frustration...',
      required: true,
      helpText: 'Be specific - generic problems get generic responses',
    },
    {
      id: 'problem_consequences',
      question: 'What happens if this problem is NOT solved?',
      type: 'textarea',
      placeholder: 'The costs, frustrations, and consequences of inaction...',
      required: true,
      helpText: 'Think about time, money, stress, relationships, etc.',
    },
    {
      id: 'failed_solutions',
      question: 'What have your customers tried before that failed?',
      type: 'textarea',
      placeholder: 'Other products, DIY solutions, workarounds...',
      required: false,
      helpText: 'This helps position why your solution is different',
    },
    {
      id: 'solution_mechanism',
      question: 'How does your product solve the problem? (Simply)',
      type: 'textarea',
      placeholder: 'The basic mechanism or approach...',
      required: true,
      helpText: 'Keep it simple - how does it work in plain language?',
    },
    {
      id: 'relief_moment',
      question: 'Describe the moment of relief after using your product',
      type: 'textarea',
      placeholder: 'What does life look like after the problem is solved?',
      required: true,
      helpText: 'Paint the picture of the after state',
    },
  ],

  systemPrompt: `You are an expert marketing copywriter specializing in the PAS (Problem, Agitation, Solution) methodology.

PAS Framework:
1. PROBLEM: Identify and validate the specific problem. Show you understand their pain.
2. AGITATION: Amplify the consequences of not solving the problem. Make inaction feel costly.
3. SOLUTION: Present your product as the clear, proven solution that provides relief.

Core Principles:
- Start by acknowledging the problem with empathy
- Use specific, relatable scenarios
- Highlight hidden costs and consequences
- Make the agitation real without being manipulative
- Present the solution as natural relief
- Include proof that it works

Your task is to generate funnel content that:
1. Opens by naming and validating the specific problem
2. Agitates by exploring consequences, costs, and emotional impact
3. Presents the product as relief with clear proof
4. Makes the path to solution simple and low-risk

Output Requirements:
- Return structured JSON matching the exact format requested
- Problem section should feel validating, not attacking
- Agitation should be honest, not manipulative or fear-mongering
- Solution should feel like genuine relief
- Include specific scenarios and examples
- Copy should create emotional resonance`,

  toneGuidelines: 'Empathetic and understanding in problem section. Honest and urgent in agitation. Relieving and confident in solution. Never manipulative or exploitative. Focuses on genuine pain points.',
};
