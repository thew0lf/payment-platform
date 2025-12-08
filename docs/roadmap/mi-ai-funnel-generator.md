# MI Feature: AI-Powered Funnel Generator

> **Status:** Planned (Post-Alpha)
> **Priority:** P3 (After P0-P2 Alpha Launch)
> **Created:** December 8, 2025
> **Author:** Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [User Flow](#user-flow)
3. [Marketing Methodologies](#marketing-methodologies)
4. [Technical Architecture](#technical-architecture)
5. [Data Models](#data-models)
6. [AI Integration](#ai-integration)
7. [Generated Content](#generated-content)
8. [Implementation Phases](#implementation-phases)
9. [API Endpoints](#api-endpoints)
10. [UI Components](#ui-components)
11. [Cost Analysis](#cost-analysis)
12. [Risks & Mitigations](#risks--mitigations)

---

## Overview

### The Feature

An AI-powered wizard that generates complete, ready-to-publish sales funnels based on:
- Selected products
- Chosen marketing methodology
- Answers to discovery questions

### Value Proposition

- **For Non-Marketers:** Launch professional funnels in minutes, not days
- **For Marketers:** Rapid prototyping and A/B variant generation
- **For Platform:** Increased stickiness, usage data for ML improvements

### Key Differentiator

Proprietary **NCI (Non-Verbal Communication Influence)** methodology creates psychologically-optimized funnels that competitors can't replicate.

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AI FUNNEL GENERATOR WIZARD                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 1: Product Selection                                              │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Select 1-5 products to feature                                       │
│  • Designate primary product vs. upsells                                │
│  • AI extracts product attributes for copy generation                   │
│                                                                         │
│                              ↓                                          │
│                                                                         │
│  STEP 2: Methodology Selection                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│  • NCI (Recommended) - Psychological influence framework                │
│  • AIDA - Classic attention-to-action                                   │
│  • PAS - Problem-focused selling                                        │
│  • StoryBrand - Customer hero journey                                   │
│  • Other frameworks (see Marketing Methodologies)                       │
│                                                                         │
│                              ↓                                          │
│                                                                         │
│  STEP 3: Discovery Questions (5-8 questions)                            │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Questions dynamically generated based on methodology                 │
│  • Each answer informs AI prompts                                       │
│  • Skip option uses intelligent defaults                                │
│                                                                         │
│                              ↓                                          │
│                                                                         │
│  STEP 4: AI Generation (with progress)                                  │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Landing page copy                                                    │
│  • Product descriptions                                                 │
│  • Email sequence (3-5 emails)                                          │
│  • Lead capture configuration                                           │
│  • Checkout copy                                                        │
│  • Success/thank-you page                                               │
│                                                                         │
│                              ↓                                          │
│                                                                         │
│  STEP 5: Review & Customize                                             │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Preview full funnel                                                  │
│  • Inline editing of any content                                        │
│  • Regenerate specific sections                                         │
│  • Save as draft or publish                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Marketing Methodologies

### Available Frameworks

| ID | Name | Focus | Best For |
|----|------|-------|----------|
| `NCI` | Non-Verbal Communication Influence | Psychological triggers, engineered reality | Premium products, high-ticket |
| `AIDA` | Attention, Interest, Desire, Action | Classic direct response | Simple products, wide appeal |
| `PAS` | Problem, Agitation, Solution | Pain-point amplification | B2B, services, solutions |
| `BAB` | Before, After, Bridge | Transformation stories | Coaching, fitness, lifestyle |
| `FOUR_PS` | Promise, Picture, Proof, Push | High-ticket persuasion | Consultative, premium |
| `STORYBRAND` | Customer Hero Journey | Brand storytelling | Service businesses, brands |
| `PASTOR` | Problem, Amplify, Story, Transform, Offer, Response | Long-form sales | Info products, courses |
| `QUEST` | Qualify, Understand, Educate, Stimulate, Transition | Complex sales | SaaS, B2B enterprise |
| `FAB` | Features, Advantages, Benefits | Technical selling | Software, technical products |

### NCI Framework (Proprietary)

```typescript
const NCIFramework = {
  name: 'NCI: Non-Verbal Communication Influence',
  tagline: 'Engineered Reality Marketing',
  philosophy: 'Engineer the emotional reality before presenting logic',

  stages: {
    // Stage 1: Engineered Reality
    reality: {
      goal: 'Create desired emotional state before any selling',
      elements: [
        'Visual hierarchy directing attention',
        'Color psychology triggering emotions',
        'Micro-animations building engagement',
        'Strategic white space creating luxury',
      ],
      copyTone: 'Confident, assumptive, exclusive',
    },

    // Stage 2: Identity Bridge
    identity: {
      goal: 'Connect product to aspirational self-image',
      elements: [
        'Transformation language ("Become...")',
        'Aspirational imagery',
        'Tribal belonging signals',
        'Status indicators',
      ],
      copyTone: 'You-focused, future-pacing',
    },

    // Stage 3: Unconscious Agreement
    agreement: {
      goal: 'Create micro-commitments before the ask',
      elements: [
        'Yes-ladder questions',
        'Strategically timed social proof',
        'Scarcity with logical justification',
        'Authority positioning',
      ],
      copyTone: 'Assumptive, choice-based',
    },

    // Stage 4: Frictionless Action
    action: {
      goal: 'Make buying feel inevitable, not decided',
      elements: [
        'Simplified choices',
        'Smart defaults',
        'Progress indicators',
        'Momentum building',
      ],
      copyTone: 'Direct, simple, action-oriented',
    },
  },

  discoveryQuestions: [
    {
      id: 'initial_emotion',
      question: 'What emotion should visitors feel within the first 3 seconds?',
      type: 'select',
      options: ['Excitement', 'Curiosity', 'Relief', 'Desire', 'Urgency', 'Trust'],
    },
    {
      id: 'transformation',
      question: 'Who does your customer want to become? (identity, not demographics)',
      type: 'text',
      placeholder: 'e.g., "A confident leader who commands respect"',
    },
    {
      id: 'objection',
      question: 'What\'s the single biggest objection that kills sales?',
      type: 'text',
      placeholder: 'e.g., "It\'s too expensive" or "I don\'t have time"',
    },
    {
      id: 'proof',
      question: 'What proof creates instant credibility?',
      type: 'text',
      placeholder: 'e.g., "10,000+ customers" or "Featured in Forbes"',
    },
    {
      id: 'pain_moment',
      question: 'Describe the moment your customer realizes they need this',
      type: 'textarea',
      placeholder: 'The specific situation or feeling...',
    },
  ],
};
```

### AIDA Framework

```typescript
const AIDAFramework = {
  name: 'AIDA',
  tagline: 'Classic Direct Response',
  philosophy: 'Guide through attention to action in logical sequence',

  stages: {
    attention: {
      goal: 'Stop the scroll, capture immediate attention',
      elements: ['Bold headline', 'Striking visual', 'Pattern interrupt'],
    },
    interest: {
      goal: 'Build curiosity and engagement',
      elements: ['Problem identification', 'Story opening', 'Surprising fact'],
    },
    desire: {
      goal: 'Create emotional want',
      elements: ['Benefits over features', 'Social proof', 'Visualization'],
    },
    action: {
      goal: 'Drive immediate response',
      elements: ['Clear CTA', 'Urgency', 'Risk reversal'],
    },
  },

  discoveryQuestions: [
    {
      id: 'attention_grabber',
      question: 'What\'s the most attention-grabbing fact about your product?',
      type: 'text',
    },
    {
      id: 'main_problem',
      question: 'What problem does it solve?',
      type: 'text',
    },
    {
      id: 'key_benefit',
      question: 'What\'s the #1 benefit customers get?',
      type: 'text',
    },
    {
      id: 'social_proof',
      question: 'What testimonials or proof do you have?',
      type: 'textarea',
    },
    {
      id: 'call_to_action',
      question: 'What\'s your primary call-to-action?',
      type: 'text',
      placeholder: 'e.g., "Start Free Trial" or "Buy Now"',
    },
  ],
};
```

---

## Technical Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SYSTEM ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │   Frontend   │────▶│  API Layer   │────▶│  AI Service  │            │
│  │   (Wizard)   │     │  (NestJS)    │     │  (Bedrock)   │            │
│  └──────────────┘     └──────────────┘     └──────────────┘            │
│         │                    │                    │                     │
│         │                    │                    │                     │
│         ▼                    ▼                    ▼                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │   Preview    │     │   Database   │     │   OpenAI     │            │
│  │   & Edit     │     │  (Postgres)  │     │  (Fallback)  │            │
│  └──────────────┘     └──────────────┘     └──────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
apps/api/src/ai-funnel-generator/
├── ai-funnel-generator.module.ts
├── ai-funnel-generator.controller.ts
├── services/
│   ├── funnel-generator.service.ts       # Orchestrates generation
│   ├── prompt-builder.service.ts         # Builds AI prompts
│   ├── content-parser.service.ts         # Parses AI output to structure
│   └── methodology-config.service.ts     # Loads methodology definitions
├── dto/
│   ├── generate-funnel.dto.ts
│   └── funnel-generation-response.dto.ts
├── methodologies/
│   ├── index.ts
│   ├── nci.methodology.ts
│   ├── aida.methodology.ts
│   ├── pas.methodology.ts
│   └── ...
└── types/
    └── funnel-generator.types.ts

apps/admin-dashboard/src/app/(dashboard)/funnels/generate/
├── page.tsx                              # Wizard container
├── steps/
│   ├── product-selection.tsx
│   ├── methodology-selection.tsx
│   ├── discovery-questions.tsx
│   ├── generation-progress.tsx
│   └── review-edit.tsx
└── components/
    ├── methodology-card.tsx
    ├── question-field.tsx
    └── content-editor.tsx
```

---

## Data Models

### Prisma Schema Additions

```prisma
// ═══════════════════════════════════════════════════════════════
// AI FUNNEL GENERATOR
// ═══════════════════════════════════════════════════════════════

model FunnelTemplate {
  id              String   @id @default(cuid())

  // Template metadata
  name            String
  description     String?
  methodology     MarketingMethodology

  // AI configuration
  systemPrompt    String   @db.Text
  stagePrompts    Json     // { landing: "...", checkout: "...", email: "..." }

  // Discovery questions
  questions       Json     // [{ id, question, type, options?, required }]

  // Default funnel structure
  defaultStages   Json     // Default stages to create

  // Template status
  isSystem        Boolean  @default(false)  // System-provided template
  isActive        Boolean  @default(true)

  // Ownership (null = system template)
  companyId       String?
  company         Company? @relation(fields: [companyId], references: [id])

  // Usage tracking
  usageCount      Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  generations     AIFunnelGeneration[]

  @@index([methodology])
  @@index([companyId])
}

model AIFunnelGeneration {
  id              String   @id @default(cuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])

  // Generation inputs
  templateId      String?
  template        FunnelTemplate? @relation(fields: [templateId], references: [id])
  methodology     MarketingMethodology
  productIds      String[]
  discoveryAnswers Json    // User's answers to questions

  // AI configuration used
  aiProvider      String   // 'bedrock' | 'openai'
  aiModel         String   // 'claude-3-sonnet' | 'gpt-4-turbo'

  // Generated content
  generatedContent Json    // Full AI output (structured)
  rawResponses    Json?    // Raw AI responses (for debugging)

  // Result
  status          GenerationStatus @default(PENDING)
  errorMessage    String?

  // Created funnel (after user saves)
  funnelId        String?  @unique
  funnel          Funnel?  @relation(fields: [funnelId], references: [id])

  // Metrics
  tokensUsed      Int?
  generationTimeMs Int?
  editCount       Int      @default(0)  // How much user edited

  // Lifecycle
  createdAt       DateTime @default(now())
  createdBy       String
  completedAt     DateTime?
  savedAt         DateTime?

  @@index([companyId])
  @@index([status])
  @@index([createdAt])
}

enum MarketingMethodology {
  NCI           // Non-Verbal Communication Influence (Proprietary)
  AIDA          // Attention, Interest, Desire, Action
  PAS           // Problem, Agitation, Solution
  BAB           // Before, After, Bridge
  FOUR_PS       // Promise, Picture, Proof, Push
  STORYBRAND    // Donald Miller's Hero Journey
  PASTOR        // Problem, Amplify, Story, Transform, Offer, Response
  QUEST         // Qualify, Understand, Educate, Stimulate, Transition
  FAB           // Features, Advantages, Benefits
  CUSTOM        // User-defined methodology
}

enum GenerationStatus {
  PENDING       // Waiting to start
  GENERATING    // AI is generating content
  COMPLETED     // Successfully generated
  FAILED        // Generation failed
  SAVED         // User saved as funnel
  DISCARDED     // User discarded
}
```

---

## AI Integration

### Provider Configuration

```typescript
// Primary: AWS Bedrock (Claude)
const bedrockConfig = {
  provider: 'AWS_BEDROCK',
  model: 'anthropic.claude-3-sonnet-20240229-v1:0',
  maxTokens: 4096,
  temperature: 0.7,  // Creative but consistent
};

// Fallback: OpenAI (GPT-4)
const openaiConfig = {
  provider: 'OPENAI',
  model: 'gpt-4-turbo-preview',
  maxTokens: 4096,
  temperature: 0.7,
};
```

### Prompt Structure

```typescript
interface FunnelPromptContext {
  // Products
  products: {
    id: string;
    name: string;
    description: string;
    price: number;
    attributes: Record<string, unknown>;
    isPrimary: boolean;
  }[];

  // Methodology
  methodology: {
    name: string;
    philosophy: string;
    stages: Record<string, { goal: string; elements: string[] }>;
    toneGuidelines: string;
  };

  // User Inputs
  discoveryAnswers: Record<string, string>;

  // Company Context (optional)
  companyContext?: {
    name: string;
    industry: string;
    brandVoice?: string;
  };
}

// Example system prompt for NCI methodology
const nciSystemPrompt = `
You are an expert marketing copywriter specializing in the NCI (Non-Verbal Communication Influence) methodology.

NCI Philosophy: Engineer the emotional reality before presenting logic.

Your task is to generate funnel content that:
1. Creates an immediate emotional state (first 3 seconds)
2. Bridges to the customer's aspirational identity
3. Builds unconscious agreement through micro-commitments
4. Makes the purchase feel inevitable, not decided

Output Requirements:
- Return structured JSON matching the requested format
- All copy should be compelling, specific, and free of clichés
- Headlines should be 6-12 words maximum
- Subheadlines should expand on the headline emotion
- Bullet points should be benefit-focused, not feature-focused
- CTAs should be action-oriented and assumptive

Tone: ${methodology.toneGuidelines}
`;
```

### Generation Sequence

```
1. Generate Landing Page Copy
   └── Headline, subheadline, hero section, benefits, social proof, CTA

2. Generate Product Descriptions (enhanced)
   └── For each product, methodology-aligned description

3. Generate Email Sequence
   └── Welcome email, value email, social proof, urgency, final CTA

4. Generate Lead Capture Config
   └── Form fields, lead magnet copy, thank-you message

5. Generate Checkout Copy
   └── Trust elements, guarantee, urgency text, order summary copy

6. Generate Success Page
   └── Thank you, next steps, upsell teaser, social share copy
```

---

## Generated Content

### Output Structure

```typescript
interface GeneratedFunnelContent {
  // Landing Page
  landing: {
    headline: string;
    subheadline: string;
    heroSection: {
      backgroundType: 'image' | 'video' | 'gradient';
      suggestedImageKeywords: string[];
    };
    benefitSection: {
      sectionTitle: string;
      benefits: Array<{
        title: string;
        description: string;
        iconSuggestion: string;
      }>;
    };
    socialProofSection: {
      sectionTitle: string;
      testimonialPrompts: string[];  // Prompts for user to add real testimonials
      statsToHighlight: string[];
    };
    ctaSection: {
      headline: string;
      buttonText: string;
      urgencyText?: string;
    };
  };

  // Product Descriptions
  products: Array<{
    productId: string;
    enhancedDescription: string;
    bulletPoints: string[];
    socialProofLine: string;
  }>;

  // Email Sequence
  emails: Array<{
    type: 'welcome' | 'value' | 'social_proof' | 'urgency' | 'final';
    subject: string;
    previewText: string;
    body: string;
    ctaText: string;
    sendDelay: number;  // Hours after signup
  }>;

  // Lead Capture
  leadCapture: {
    headline: string;
    description: string;
    leadMagnetTitle?: string;
    formFields: Array<{
      name: string;
      label: string;
      type: 'text' | 'email' | 'phone' | 'select';
      required: boolean;
    }>;
    buttonText: string;
    privacyText: string;
  };

  // Checkout
  checkout: {
    trustBadgeText: string[];
    guaranteeText: string;
    urgencyText: string;
    orderSummaryTitle: string;
  };

  // Success Page
  success: {
    headline: string;
    message: string;
    nextSteps: string[];
    socialShareText: string;
    upsellTeaser?: string;
  };
}
```

---

## Implementation Phases

### Phase 1: MVP (Sprint 1-2)

**Scope:**
- Single methodology (NCI)
- Landing page + checkout generation only
- 5 discovery questions
- Basic inline editing
- No email sequence

**Deliverables:**
- [ ] Database schema migration
- [ ] Prompt builder service
- [ ] NCI methodology definition
- [ ] Basic wizard UI (4 steps)
- [ ] Content generation endpoint
- [ ] Preview and edit view

### Phase 2: Full Framework (Sprint 3-4)

**Scope:**
- All 9 methodologies
- Email sequence generation
- Lead capture configuration
- A/B variant generation (2 variants)
- Regenerate individual sections

**Deliverables:**
- [ ] All methodology definitions
- [ ] Email generation prompts
- [ ] Lead capture prompts
- [ ] Variant generation logic
- [ ] Section-level regeneration

### Phase 3: Intelligence (Sprint 5-6)

**Scope:**
- Learning from conversion data
- Auto-optimization suggestions
- Industry-specific templates
- Custom methodology builder

**Deliverables:**
- [ ] Conversion tracking integration
- [ ] Recommendation engine
- [ ] Industry template library
- [ ] Custom methodology UI

---

## API Endpoints

```typescript
// ═══════════════════════════════════════════════════════════════
// AI FUNNEL GENERATOR ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Get available methodologies
GET /api/ai-funnel/methodologies
Response: { methodologies: Methodology[] }

// Get methodology questions
GET /api/ai-funnel/methodologies/:id/questions
Response: { questions: Question[] }

// Start funnel generation
POST /api/ai-funnel/generate
Body: {
  productIds: string[];
  methodology: MarketingMethodology;
  discoveryAnswers: Record<string, string>;
}
Response: { generationId: string }

// Get generation status/result
GET /api/ai-funnel/generations/:id
Response: { status, progress?, content? }

// Regenerate specific section
POST /api/ai-funnel/generations/:id/regenerate
Body: { section: 'landing' | 'emails' | 'checkout' | ... }
Response: { sectionContent: ... }

// Save as funnel
POST /api/ai-funnel/generations/:id/save
Body: { name: string, content: GeneratedFunnelContent }
Response: { funnelId: string }

// Discard generation
DELETE /api/ai-funnel/generations/:id
Response: { success: true }
```

---

## UI Components

### Admin Dashboard Pages

```
/funnels/generate                    # Wizard entry point
/funnels/generate/products           # Step 1: Product selection
/funnels/generate/methodology        # Step 2: Methodology selection
/funnels/generate/questions          # Step 3: Discovery questions
/funnels/generate/progress/:id       # Step 4: Generation progress
/funnels/generate/review/:id         # Step 5: Review and edit
```

### Key Components

```typescript
// Methodology selection card
<MethodologyCard
  methodology={methodology}
  isSelected={selected}
  isRecommended={methodology.id === 'NCI'}
  onClick={onSelect}
/>

// Discovery question field
<QuestionField
  question={question}
  value={answers[question.id]}
  onChange={handleChange}
  error={errors[question.id]}
/>

// Generation progress
<GenerationProgress
  status={status}
  progress={progress}
  stages={[
    { name: 'Landing Page', status: 'complete' },
    { name: 'Emails', status: 'generating' },
    { name: 'Checkout', status: 'pending' },
  ]}
/>

// Content editor with regenerate
<ContentEditor
  section="landing.headline"
  content={content}
  onChange={handleEdit}
  onRegenerate={handleRegenerate}
/>
```

---

## Cost Analysis

### Per-Generation Estimate (Claude 3.5 Sonnet)

| Component | Input Tokens | Output Tokens | Cost |
|-----------|--------------|---------------|------|
| Landing Page | ~1,500 | ~2,000 | $0.035 |
| Products (x3) | ~1,000 | ~1,500 | $0.025 |
| Emails (x5) | ~1,200 | ~3,000 | $0.050 |
| Lead Capture | ~500 | ~500 | $0.010 |
| Checkout | ~500 | ~500 | $0.010 |
| Success | ~500 | ~500 | $0.010 |
| **Total** | ~5,200 | ~8,000 | **~$0.14** |

### Monthly Projections

| Usage Tier | Generations/Mo | Cost/Mo |
|------------|---------------|---------|
| Low | 100 | $14 |
| Medium | 500 | $70 |
| High | 2,000 | $280 |

### Pricing Recommendation

- **Free Tier:** 3 generations/month
- **Starter:** 10 generations/month
- **Growth:** 50 generations/month
- **Enterprise:** Unlimited

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI generates poor copy | High | Medium | Multiple regeneration options, human review prompt |
| Legal issues from AI claims | High | Low | Disclaimer, review checklist, claim validation |
| High token costs | Medium | Medium | Caching, usage limits, efficient prompts |
| Homogenized funnels | Medium | Medium | Variant generation, methodology diversity |
| Users blame AI for poor results | Medium | High | Education, clear expectations, editing tools |
| API rate limits | Low | Low | Queue system, retry logic |

---

## Dependencies

### Required Before Implementation

- [x] AWS Bedrock integration (complete)
- [x] OpenAI integration (complete)
- [x] Funnel builder (complete)
- [ ] Email system integration (P2)
- [ ] Lead capture system (P1)

### NPM Packages

```json
{
  // Already installed
  "@aws-sdk/client-bedrock-runtime": "^3.x",

  // May need
  "zod": "^3.x"  // For structured output validation
}
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Generation completion rate | >90% | Completed / Started |
| Time to first funnel | <10 min | Wizard start to save |
| User edit rate | 20-40% | Sections edited / total |
| Funnel publish rate | >60% | Published / Saved |
| User satisfaction | >4.0/5 | Post-generation survey |

---

## Related Documents

- [Funnel Alpha Launch Requirements](./funnel-alpha-launch.md)
- [MI Billing Intelligence](./mi-billing-intelligence.md)
- [MI Funnel Tracking](./mi-funnel-tracking.md)

---

*Document Version: 1.0*
*Created: December 8, 2025*
*Author: Development Team*
