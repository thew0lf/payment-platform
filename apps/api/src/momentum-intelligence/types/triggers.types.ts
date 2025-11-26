/**
 * Behavioral Triggers Library Types
 * Based on NCI (Non-Verbal Communication Influence) Methodology
 */

// ═══════════════════════════════════════════════════════════════
// TRIGGER DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export enum BehavioralTriggerType {
  PATTERN_INTERRUPT = 'PATTERN_INTERRUPT',
  LOSS_AVERSION = 'LOSS_AVERSION',
  IDENTITY_ALIGNMENT = 'IDENTITY_ALIGNMENT',
  SOCIAL_PROOF = 'SOCIAL_PROOF',
  SCARCITY = 'SCARCITY',
  URGENCY = 'URGENCY',
  RECIPROCITY = 'RECIPROCITY',
  ANCHORING = 'ANCHORING',
  FUTURE_PACING = 'FUTURE_PACING',
  COMMITMENT_CONSISTENCY = 'COMMITMENT_CONSISTENCY',
  AUTHORITY = 'AUTHORITY',
  OWNERSHIP_VELOCITY = 'OWNERSHIP_VELOCITY',
  CONTRAST_PRINCIPLE = 'CONTRAST_PRINCIPLE',
}

export interface BehavioralTrigger {
  type: BehavioralTriggerType;
  name: string;
  description: string;
  principle: string;
  examples: TriggerExample[];
  useCases: string[];
  effectiveness: {
    conversionLift: string;
    bestFor: string[];
    avoid: string[];
  };
}

export interface TriggerExample {
  context: string;
  before: string;
  after: string;
  explanation: string;
}

export interface TriggerApplication {
  triggerType: BehavioralTriggerType;
  targetElement: string;
  originalContent: string;
  enhancedContent: string;
  variables: Record<string, unknown>;
  confidence: number;
}

export interface TriggerConfig {
  enabled: boolean;
  priority: number;
  maxApplicationsPerPage: number;
  contexts: string[];
}

// ═══════════════════════════════════════════════════════════════
// TRIGGER LIBRARY (Full Definitions)
// ═══════════════════════════════════════════════════════════════

export const BEHAVIORAL_TRIGGERS: BehavioralTrigger[] = [
  {
    type: BehavioralTriggerType.PATTERN_INTERRUPT,
    name: 'Pattern Interrupt',
    description: 'Breaks the expected flow to capture attention and create openness to new information.',
    principle: "When someone's mental pattern is disrupted, they become more receptive to suggestion.",
    examples: [
      {
        context: 'Cancel page headline',
        before: 'Cancel Subscription',
        after: "Wait! You're 40% through your Coffee Journey...",
        explanation: 'Instead of confirming the cancel action, we interrupt with unexpected progress data.',
      },
      {
        context: 'Cart abandonment',
        before: 'Complete your purchase',
        after: 'Your Ethiopian Yirgacheffe is getting lonely...',
        explanation: 'Personification creates unexpected emotional connection.',
      },
    ],
    useCases: ['Cancel flows', 'Cart abandonment', 'Exit intent', 'Onboarding'],
    effectiveness: {
      conversionLift: '+15-25%',
      bestFor: ['High-intent exit moments', 'Breaking negative momentum'],
      avoid: ['Routine interactions', 'When trust is low'],
    },
  },
  {
    type: BehavioralTriggerType.LOSS_AVERSION,
    name: 'Loss Aversion',
    description: 'Emphasizes what will be lost rather than what could be gained. People feel losses 2x as strongly as equivalent gains.',
    principle: 'The pain of losing something is psychologically twice as powerful as the pleasure of gaining.',
    examples: [
      {
        context: 'Cancel confirmation',
        before: 'Are you sure you want to cancel?',
        after: "You'll lose $23.50 in rewards and your Explorer progress",
        explanation: 'Focuses on tangible losses rather than abstract subscription.',
      },
      {
        context: 'Expiring offer',
        before: 'Get 20% off',
        after: "Don't lose your 20% member discount",
        explanation: 'Frames discount as something they have that will be taken away.',
      },
    ],
    useCases: ['Cancellation prevention', 'Renewals', 'Upgrade prompts', 'Limited offers'],
    effectiveness: {
      conversionLift: '+20-35%',
      bestFor: ['Customers with accumulated value', 'Time-sensitive decisions'],
      avoid: ['New customers with nothing to lose', 'Over-use (creates anxiety)'],
    },
  },
  {
    type: BehavioralTriggerType.IDENTITY_ALIGNMENT,
    name: 'Identity Alignment',
    description: 'Connects the action to who the person sees themselves as or wants to become.',
    principle: 'People act consistently with their self-image and aspirational identity.',
    examples: [
      {
        context: 'Subscription pitch',
        before: 'Subscribe to our coffee service',
        after: 'Join 10,000+ Coffee Explorers discovering the world one cup at a time',
        explanation: 'Associates subscription with desirable identity of "explorer".',
      },
      {
        context: 'Retention message',
        before: 'Keep your subscription',
        after: 'Continue your journey as a Coffee Connoisseur',
        explanation: "Reinforces identity they've been building.",
      },
    ],
    useCases: ['Brand positioning', 'Community building', 'Premium tiers', 'Loyalty programs'],
    effectiveness: {
      conversionLift: '+10-20%',
      bestFor: ['Lifestyle brands', 'Long-term customers', 'Premium segments'],
      avoid: ['Transactional contexts', 'New/uncommitted customers'],
    },
  },
  {
    type: BehavioralTriggerType.SOCIAL_PROOF,
    name: 'Social Proof',
    description: 'Shows that others (especially similar others) have taken the desired action.',
    principle: "People look to others' actions to determine correct behavior, especially in uncertainty.",
    examples: [
      {
        context: 'Save flow',
        before: 'Stay subscribed',
        after: '94% of members who reached this point decided to stay',
        explanation: 'Shows that most similar people made the opposite choice.',
      },
      {
        context: 'Product page',
        before: 'Add to cart',
        after: '2,847 coffee lovers ordered this month',
        explanation: 'Demonstrates popularity and reduces risk perception.',
      },
    ],
    useCases: ['Decision points', 'New features', 'Pricing pages', 'Reviews'],
    effectiveness: {
      conversionLift: '+15-30%',
      bestFor: ['Uncertain customers', 'New products', 'High-consideration purchases'],
      avoid: ['When numbers are low', 'B2B (may prefer exclusivity)'],
    },
  },
  {
    type: BehavioralTriggerType.SCARCITY,
    name: 'Scarcity',
    description: 'Creates perception of limited availability to increase desire.',
    principle: 'Things become more valuable when they are rare or becoming unavailable.',
    examples: [
      {
        context: 'Product offer',
        before: 'Try our limited edition',
        after: 'Only 47 bags remaining - Reserve yours',
        explanation: 'Specific number creates tangible scarcity.',
      },
      {
        context: 'Retention offer',
        before: 'Get 30% off',
        after: 'Your exclusive 30% offer - available only to members like you',
        explanation: 'Exclusivity creates scarcity of access.',
      },
    ],
    useCases: ['Limited editions', 'Flash sales', 'VIP offers', 'Last chance messaging'],
    effectiveness: {
      conversionLift: '+10-25%',
      bestFor: ['Genuine limited availability', 'Premium products', 'Time-sensitive offers'],
      avoid: ['Fake scarcity (destroys trust)', 'Evergreen products', 'Over-use'],
    },
  },
  {
    type: BehavioralTriggerType.URGENCY,
    name: 'Urgency',
    description: 'Creates time pressure to encourage immediate action.',
    principle: 'Deadlines compress decision-making and reduce procrastination.',
    examples: [
      {
        context: 'Nuclear offer',
        before: 'Special discount available',
        after: 'This offer expires in 10:00 minutes',
        explanation: 'Countdown creates immediate pressure to decide.',
      },
      {
        context: 'Cart reminder',
        before: 'Your cart is waiting',
        after: 'Your cart expires tonight at midnight',
        explanation: 'Specific deadline creates action trigger.',
      },
    ],
    useCases: ['Limited-time offers', 'Cart abandonment', 'Event registrations', 'Renewals'],
    effectiveness: {
      conversionLift: '+15-35%',
      bestFor: ['Price-sensitive decisions', 'Procrastinators', 'Genuine deadlines'],
      avoid: ['Fake urgency', 'High-consideration purchases', 'Trust-building moments'],
    },
  },
  {
    type: BehavioralTriggerType.RECIPROCITY,
    name: 'Reciprocity',
    description: 'Creates obligation by giving something first.',
    principle: 'People feel compelled to return favors and balance exchanges.',
    examples: [
      {
        context: 'Save offer',
        before: 'Get 20% off',
        after: "We'd like to give you 20% off as a thank you for being with us",
        explanation: 'Frames discount as gift, creating reciprocal obligation.',
      },
      {
        context: 'Free sample',
        before: 'Try before you buy',
        after: 'Your complimentary sample is on its way - no strings attached',
        explanation: 'True free gift creates stronger reciprocity.',
      },
    ],
    useCases: ['Retention offers', 'Lead generation', 'Upsells after great support', 'Referrals'],
    effectiveness: {
      conversionLift: '+10-20%',
      bestFor: ['Service recovery', 'Long-term customers', 'Building loyalty'],
      avoid: ['When it feels manipulative', 'Transactional contexts'],
    },
  },
  {
    type: BehavioralTriggerType.ANCHORING,
    name: 'Anchoring',
    description: 'Establishes a reference point that influences subsequent judgments.',
    principle: 'The first piece of information received disproportionately influences decisions.',
    examples: [
      {
        context: 'Pricing display',
        before: '$26.95/month',
        after: 'Retail value: $45/month. Your price: $26.95',
        explanation: 'Higher anchor makes actual price feel like a deal.',
      },
      {
        context: 'Daily cost',
        before: '$26.95 per month',
        after: 'Less than $0.90/day - cheaper than a single cafe latte',
        explanation: 'Small daily anchor makes monthly feel affordable.',
      },
    ],
    useCases: ['Pricing pages', 'Comparison shopping', 'Discount presentation', 'Value framing'],
    effectiveness: {
      conversionLift: '+15-25%',
      bestFor: ['Price-sensitive customers', 'Premium products', 'Subscription framing'],
      avoid: ['When anchors seem unrealistic', 'Sophisticated B2B buyers'],
    },
  },
  {
    type: BehavioralTriggerType.FUTURE_PACING,
    name: 'Future Pacing',
    description: 'Helps the person visualize positive future outcomes from taking action.',
    principle: 'Mental rehearsal of positive outcomes increases likelihood of action.',
    examples: [
      {
        context: 'Subscription pitch',
        before: 'Start your subscription',
        after: 'Imagine waking up to freshly roasted coffee every month...',
        explanation: 'Creates vivid positive future scenario.',
      },
      {
        context: 'Retention',
        before: 'Stay subscribed',
        after: "In 3 months, you'll have explored 6 new origins and unlocked Connoisseur status",
        explanation: 'Projects specific positive milestones.',
      },
    ],
    useCases: ['Onboarding', 'Upgrade prompts', 'Long-term commitments', 'Goal setting'],
    effectiveness: {
      conversionLift: '+10-20%',
      bestFor: ['Aspirational purchases', 'Subscription starts', 'Loyalty programs'],
      avoid: ['Skeptical audiences', 'Short-term offers'],
    },
  },
  {
    type: BehavioralTriggerType.COMMITMENT_CONSISTENCY,
    name: 'Commitment & Consistency',
    description: 'Leverages prior commitments to encourage consistent future behavior.',
    principle: 'People strive to be consistent with their past actions and statements.',
    examples: [
      {
        context: 'Cancel flow',
        before: 'Cancel subscription',
        after: "You joined because you wanted to explore new coffees. You've discovered 6 favorites so far.",
        explanation: 'Reminds of original commitment and progress made.',
      },
      {
        context: 'Survey completion',
        before: 'Complete survey',
        after: "You're 3 questions in. Finish to help us improve.",
        explanation: 'Sunk cost of started action drives completion.',
      },
    ],
    useCases: ['Retention', 'Multi-step processes', 'Upgrade paths', 'Feedback collection'],
    effectiveness: {
      conversionLift: '+15-25%',
      bestFor: ['Existing customers', 'Progress-based products', 'Loyalty programs'],
      avoid: ['New customers', 'When past experience was negative'],
    },
  },
  {
    type: BehavioralTriggerType.AUTHORITY,
    name: 'Authority',
    description: 'Leverages expertise, credentials, or endorsements to build trust.',
    principle: 'People defer to experts and trusted authorities.',
    examples: [
      {
        context: 'Product quality',
        before: 'High quality coffee',
        after: 'Selected by Q Graders with 85+ cup scores',
        explanation: 'Industry credentials add objective authority.',
      },
      {
        context: 'Recommendation',
        before: 'We recommend...',
        after: 'Based on your taste profile, our Coffee Experts suggest...',
        explanation: 'Expert recommendation carries more weight.',
      },
    ],
    useCases: ['Product quality claims', 'Personalization', 'Premium positioning', 'Health/safety'],
    effectiveness: {
      conversionLift: '+10-15%',
      bestFor: ['New customers', 'Premium products', 'Complex decisions'],
      avoid: ["When authority isn't relevant", 'Skeptical audiences'],
    },
  },
  {
    type: BehavioralTriggerType.OWNERSHIP_VELOCITY,
    name: 'Ownership Velocity',
    description: 'Transfers psychological ownership as quickly as possible.',
    principle: 'Once people feel ownership, they value things more highly (endowment effect).',
    examples: [
      {
        context: 'Order confirmation',
        before: 'Order placed successfully',
        after: 'Your Ethiopian Yirgacheffe is being prepared just for you',
        explanation: 'Immediate personalization creates ownership.',
      },
      {
        context: 'Cancel prevention',
        before: 'Your subscription',
        after: 'Your curated coffee collection',
        explanation: 'Language emphasizes what they own.',
      },
    ],
    useCases: ['Onboarding', 'Personalization', 'Post-purchase', 'Retention'],
    effectiveness: {
      conversionLift: '+10-20%',
      bestFor: ['Customized products', 'Subscription boxes', 'High-touch services'],
      avoid: ['Generic products', 'Pre-purchase (can backfire)'],
    },
  },
  {
    type: BehavioralTriggerType.CONTRAST_PRINCIPLE,
    name: 'Contrast Principle',
    description: 'Presents options in a way that makes the desired choice look better by comparison.',
    principle: 'Judgments are relative - we evaluate things based on what we just experienced.',
    examples: [
      {
        context: 'Pricing tiers',
        before: 'Basic $15, Premium $30',
        after: 'Basic $15, Premium $30 (most popular), Platinum $60',
        explanation: 'Middle option looks better with expensive option present.',
      },
      {
        context: 'Save offer',
        before: '20% off',
        after: 'Other members pay full price. Your exclusive rate: 20% off',
        explanation: 'Contrast with others makes offer more valuable.',
      },
    ],
    useCases: ['Pricing pages', 'Plan selection', 'Upgrade prompts', 'A/B offers'],
    effectiveness: {
      conversionLift: '+20-30%',
      bestFor: ['Tiered pricing', 'Plan selection', 'Premium positioning'],
      avoid: ['When all options should be equal', 'Simple binary choices'],
    },
  },
];

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export interface ApplyTriggersDto {
  content: string;
  context: 'cancel_flow' | 'email' | 'sms' | 'landing_page' | 'checkout' | 'onboarding';
  customerData?: {
    tenureMonths?: number;
    lifetimeValue?: number;
    engagementScore?: number;
    productsExplored?: number;
    rewardsBalance?: number;
  };
  triggers?: BehavioralTriggerType[];
  maxTriggers?: number;
}

export interface EnhancedContent {
  original: string;
  enhanced: string;
  triggersApplied: TriggerApplication[];
  estimatedLift: string;
}

export interface GetTriggerSuggestionsDto {
  context: string;
  goal: 'conversion' | 'retention' | 'engagement' | 'upsell';
  customerSegment?: string;
}
