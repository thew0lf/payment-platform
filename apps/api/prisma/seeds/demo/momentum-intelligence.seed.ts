import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// SEED CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// These will be populated from the database
let COMPANY_ID: string;

async function main() {
  console.log('🌱 Seeding Momentum Intelligence data...\n');

  // First, find the company to seed data for (coffee-co from main seed)
  const company = await prisma.company.findFirst({
    where: { slug: 'coffee-co' },
  });

  if (!company) {
    console.error('❌ Company "coffee-co" not found. Please run the main seed first:');
    console.error('   npx prisma db seed');
    process.exit(1);
  }

  COMPANY_ID = company.id;
  console.log(`📍 Using company: ${company.name} (${COMPANY_ID})\n`);

  // Seed in order of dependencies
  await seedSaveFlowConfig();
  await seedCSConfig();
  await seedRefundPolicy();
  await seedRMAPolicy();
  await seedTermsDocuments();
  await seedContentTemplates();
  await seedContentGenerationConfig();
  await seedSampleCustomerData();

  console.log('\n✅ Momentum Intelligence seed complete!');
}

// ═══════════════════════════════════════════════════════════════
// SAVE FLOW CONFIGURATION
// ═══════════════════════════════════════════════════════════════

async function seedSaveFlowConfig() {
  console.log('📋 Seeding Save Flow Configuration...');

  await prisma.saveFlowConfig.upsert({
    where: { companyId: COMPANY_ID },
    update: {},
    create: {
      companyId: COMPANY_ID,
      enabled: true,
      patternInterrupt: {
        enabled: true,
        showProgress: true,
        showRewards: true,
        showNextShipment: true,
        customHeadline: "Wait! You're {{progress}}% through your Coffee Journey...",
        customSubheadline: "Before you go, take a look at what you've built",
      },
      diagnosisSurvey: {
        enabled: true,
        allowSkip: true,
        allowOther: true,
        questions: [
          {
            id: 'main_reason',
            text: "What's the main reason you're thinking of leaving?",
            type: 'single',
            required: true,
            options: [
              { id: 'too_expensive', text: "It's too expensive", cancelReason: 'TOO_EXPENSIVE', routesTo: 'discount_branch' },
              { id: 'not_using', text: "I'm not using it enough", cancelReason: 'NOT_USING', routesTo: 'pause_branch' },
              { id: 'wrong_product', text: "The coffee isn't right for me", cancelReason: 'WRONG_PRODUCT', routesTo: 'swap_branch' },
              { id: 'too_much', text: 'I have too much coffee', cancelReason: 'TOO_MUCH_PRODUCT', routesTo: 'pause_branch' },
              { id: 'shipping', text: 'Shipping or delivery issues', cancelReason: 'SHIPPING_ISSUES', routesTo: 'support_branch' },
              { id: 'temporary', text: 'I just need a break', cancelReason: 'TEMPORARY_PAUSE', routesTo: 'pause_branch' },
              { id: 'other', text: 'Other', cancelReason: 'OTHER', routesTo: 'generic_branch' },
            ],
          },
        ],
      },
      branchingInterventions: {
        enabled: true,
        branches: [
          {
            id: 'discount_branch',
            name: 'Price-Sensitive',
            triggerReasons: ['TOO_EXPENSIVE'],
            interventions: [
              {
                type: 'DISCOUNT',
                enabled: true,
                priority: 1,
                headline: "We'd hate to see you go over price",
                descriptionTemplate: "How about {{discount}}% off your next {{duration}} months?",
                ctaText: 'Apply Discount',
                maxDiscountPercent: 25,
              },
            ],
          },
          {
            id: 'pause_branch',
            name: 'Need a Break',
            triggerReasons: ['NOT_USING', 'TOO_MUCH_PRODUCT', 'TEMPORARY_PAUSE'],
            interventions: [
              {
                type: 'PAUSE',
                enabled: true,
                priority: 1,
                headline: 'Take a coffee break',
                descriptionTemplate: 'Pause your subscription for up to {{maxDays}} days.',
                ctaText: 'Pause Subscription',
                maxPauseDays: 60,
              },
            ],
          },
          {
            id: 'swap_branch',
            name: 'Product Mismatch',
            triggerReasons: ['WRONG_PRODUCT'],
            interventions: [
              {
                type: 'PRODUCT_SWAP',
                enabled: true,
                priority: 1,
                headline: "Let's find your perfect match",
                descriptionTemplate: "Tell us what you're looking for and we'll curate your next box just for you.",
                ctaText: 'Customize My Box',
              },
            ],
          },
          {
            id: 'support_branch',
            name: 'Service Issues',
            triggerReasons: ['SHIPPING_ISSUES'],
            interventions: [
              {
                type: 'CUSTOM_OFFER',
                enabled: true,
                priority: 1,
                headline: "We're sorry about the shipping issues",
                descriptionTemplate: "How about free shipping for your next 3 months?",
                ctaText: 'Accept Offer',
              },
            ],
          },
          {
            id: 'generic_branch',
            name: 'Generic Save',
            triggerReasons: ['OTHER'],
            interventions: [
              {
                type: 'DISCOUNT',
                enabled: true,
                priority: 1,
                headline: 'Before you go...',
                descriptionTemplate: 'How about 15% off your next 2 months?',
                ctaText: 'Apply Discount',
                maxDiscountPercent: 15,
              },
            ],
          },
        ],
      },
      nuclearOffer: {
        enabled: true,
        triggerAfterDeclines: 2,
        maxDiscountPercent: 30,
        maxPauseDays: 90,
        includeFreeItem: true,
        headline: 'Wait! Our best offer yet',
        urgencyEnabled: true,
      },
      lossVisualization: {
        enabled: true,
        showProgress: true,
        showRewards: true,
        showUpcomingPerks: true,
        showSocialProof: true,
        retentionPeriodDays: 90,
      },
      exitSurvey: {
        enabled: true,
        required: false,
        allowFreeText: true,
        showWinbackOffer: true,
        questions: [
          {
            id: 'final_reason',
            text: 'What could we have done differently?',
            type: 'text',
            required: false,
          },
          {
            id: 'would_recommend',
            text: 'How likely are you to recommend us to a friend?',
            type: 'scale',
            min: 0,
            max: 10,
            required: false,
          },
        ],
      },
      winback: {
        enabled: true,
        maxAttempts: 3,
        cooldownDays: 7,
        sequences: [
          {
            id: 'winback_7day',
            name: '7-Day Winback',
            triggerDays: 7,
            channel: 'email',
            templateId: 'tpl_winback_7day',
            offer: { type: 'DISCOUNT', value: 25, description: '25% off your return' },
          },
          {
            id: 'winback_14day',
            name: '14-Day Winback',
            triggerDays: 14,
            channel: 'email',
            templateId: 'tpl_winback_14day',
            offer: { type: 'DISCOUNT', value: 30, description: '30% off + free shipping' },
          },
          {
            id: 'winback_30day',
            name: '30-Day Winback',
            triggerDays: 30,
            channel: 'sms',
            templateId: 'tpl_winback_30day_sms',
            offer: { type: 'FREE_ITEM', value: 1, description: 'Free premium bag on return' },
          },
        ],
      },
      voiceAIEnabled: true,
      voiceAIConfig: {
        enabled: true,
        triggerOnCall: true,
        scriptId: 'default_save_script',
      },
    },
  });

  console.log('  ✓ Save Flow Config created');
}

// ═══════════════════════════════════════════════════════════════
// CUSTOMER SERVICE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

async function seedCSConfig() {
  console.log('🎧 Seeding Customer Service Configuration...');

  await prisma.cSConfig.upsert({
    where: { companyId: COMPANY_ID },
    update: {},
    create: {
      companyId: COMPANY_ID,
      enabled: true,
      aiRepConfig: {
        tier: 'AI_REP',
        enabled: true,
        persona: {
          name: 'Alex',
          role: 'Customer Service Representative',
          greeting: "Hi! I'm Alex, and I'm here to help you today. How can I assist you?",
          tone: ['friendly', 'helpful', 'patient', 'understanding'],
          signoff: 'Is there anything else I can help you with today?',
        },
        aiSettings: {
          systemPrompt: `You are Alex, a friendly customer service representative for a premium coffee subscription service.
Your goals:
1. Help customers resolve their issues quickly
2. Look for opportunities to prevent cancellations
3. Offer appropriate solutions within your authority
4. Escalate to your manager when needed`,
          temperature: 0.7,
          maxTokens: 1024,
          responseStyle: 'conversational',
        },
        authority: {
          maxRefundAmount: 50,
          canWaiveFees: false,
          canApproveRMA: false,
          canOfferDiscount: true,
          maxDiscountPercent: 15,
          canIssueCredit: true,
          maxCreditAmount: 25,
          canCancelSubscription: false,
          canOfferHumanHandoff: false,
        },
        escalationRules: {
          sentimentThreshold: -0.5,
          maxSaveAttempts: 2,
          irateKeywords: ['supervisor', 'manager', 'unacceptable', 'ridiculous', 'lawsuit'],
          autoEscalateIssues: ['fraud', 'legal', 'security', 'harassment'],
        },
      },
      aiManagerConfig: {
        tier: 'AI_MANAGER',
        enabled: true,
        persona: {
          name: 'Sarah',
          role: 'Customer Service Manager',
          greeting: "Hi, this is Sarah, the Customer Service Manager. I have the authority to resolve this for you today.",
          tone: ['professional', 'empathetic', 'authoritative', 'solution-focused', 'calm'],
          signoff: "I want to make sure you're completely satisfied. Is there anything else I can do?",
        },
        aiSettings: {
          systemPrompt: `You are Sarah, a Customer Service Manager with full authority to resolve escalated issues.
Your authority:
- Approve refunds up to $500
- Waive any fees
- Approve RMAs immediately
- Offer significant discounts (up to 30%)
- Issue store credit bonuses
- Cancel subscriptions when appropriate
- Offer human agent handoff (if enabled)`,
          temperature: 0.6,
          maxTokens: 1024,
          responseStyle: 'professional',
        },
        authority: {
          maxRefundAmount: 500,
          canWaiveFees: true,
          canApproveRMA: true,
          canOfferDiscount: true,
          maxDiscountPercent: 30,
          canIssueCredit: true,
          maxCreditAmount: 100,
          canCancelSubscription: true,
          canOfferHumanHandoff: true,
        },
        escalationRules: {
          sentimentThreshold: -0.8,
          maxSaveAttempts: 3,
          irateKeywords: ['lawyer', 'lawsuit', 'bbb', 'news', 'social media'],
          autoEscalateIssues: ['legal threat', 'media threat', 'physical threat'],
        },
      },
      humanAgentConfig: {
        enabled: true,
        queueId: null,
        maxWaitTime: 900, // 15 minutes in seconds
        fallbackMessage: "I'm sorry, no agents are available right now. Please try again during business hours or leave a message.",
        availableHours: 'Monday-Friday 9am-5pm, Saturday 10am-2pm EST',
        // Escalation phone configuration
        escalationPhone: process.env.DEMO_ESCALATION_PHONE || '+15551234567', // Demo phone - configure in env
        escalationPhoneBackup: process.env.DEMO_ESCALATION_PHONE_BACKUP || null,
        notifyOnEscalation: true,
        notificationPhone: process.env.DEMO_NOTIFICATION_PHONE || null, // Same as escalation if not set
      },
      irateProtocol: {
        enabled: true,
        escalationThreshold: -0.7,
        cooldownPhrases: [
          "I completely understand your frustration",
          "I'm so sorry you're experiencing this",
          "Let me make this right for you",
        ],
        immediateEscalation: ['lawsuit', 'lawyer', 'police', 'news'],
      },
      channelConfigs: {
        voice: { enabled: true, aiEnabled: true, transcription: true },
        chat: { enabled: true, aiEnabled: true, typing: true },
        email: { enabled: true, aiEnabled: true, responseTime: 4 },
        sms: { enabled: true, aiEnabled: true, shortResponses: true },
      },
      businessHours: {
        timezone: 'America/New_York',
        aiAvailable: '24/7',
        humanAvailable: {
          monday: { open: '09:00', close: '17:00' },
          tuesday: { open: '09:00', close: '17:00' },
          wednesday: { open: '09:00', close: '17:00' },
          thursday: { open: '09:00', close: '17:00' },
          friday: { open: '09:00', close: '17:00' },
        },
      },
      responseTemplates: [],
      integrations: {},
    },
  });

  console.log('  ✓ Customer Service Config created');
}

// ═══════════════════════════════════════════════════════════════
// REFUND POLICY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

async function seedRefundPolicy() {
  console.log('💰 Seeding Refund Policy...');

  await prisma.refundPolicy.upsert({
    where: { companyId: COMPANY_ID },
    update: {},
    create: {
      companyId: COMPANY_ID,
      enabled: true,
      generalRules: {
        maxRefundDays: 30,
        maxRefundAmount: 500,
        requireReceipt: false,
        requireReason: true,
      },
      autoApprovalRules: [
        {
          id: 'auto_defect',
          name: 'Auto-approve defective products',
          conditions: { reasons: ['PRODUCT_DEFECT', 'SHIPPING_DAMAGE'], maxAmount: 50 },
          action: 'approve',
          enabled: true,
        },
        {
          id: 'auto_duplicate',
          name: 'Auto-approve duplicate charges',
          conditions: { reasons: ['DUPLICATE_CHARGE'], maxAmount: 100 },
          action: 'approve',
          enabled: true,
        },
        {
          id: 'auto_never_received',
          name: 'Auto-approve never received',
          conditions: { reasons: ['NEVER_RECEIVED'], maxAmount: 75, minDaysSinceShip: 14 },
          action: 'approve',
          enabled: true,
        },
      ],
      tierLimits: {
        AI_REP: { maxAmount: 50, requiresApproval: false },
        AI_MANAGER: { maxAmount: 500, requiresApproval: false },
        HUMAN_AGENT: { maxAmount: 1000, requiresApproval: true },
      },
      reasonSpecificRules: [
        { reason: 'PRODUCT_DEFECT', autoApprove: true, maxDays: 90 },
        { reason: 'CUSTOMER_REQUEST', autoApprove: false, maxDays: 14 },
      ],
      notifications: {
        emailOnRequest: true,
        emailOnApproval: true,
        emailOnRejection: true,
        emailOnCompletion: true,
      },
      fraudPrevention: {
        enabled: true,
        maxRefundsPerCustomer: 5,
        maxRefundsPerMonth: 3,
        flagHighValueRefunds: true,
        highValueThreshold: 200,
        velocityCheck: true,
      },
    },
  });

  console.log('  ✓ Refund Policy created');
}

// ═══════════════════════════════════════════════════════════════
// RMA POLICY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

async function seedRMAPolicy() {
  console.log('📦 Seeding RMA Policy...');

  await prisma.rMAPolicy.upsert({
    where: { companyId: COMPANY_ID },
    update: {},
    create: {
      companyId: COMPANY_ID,
      enabled: true,
      generalRules: {
        rmaValidityDays: 30,
        autoApprove: true,
        autoApproveMaxAmount: 75,
        requirePhotos: false,
        requireOriginalPackaging: false,
      },
      returnReasons: [
        { id: 'defective', label: 'Defective product', requireReturn: false, autoApprove: true },
        { id: 'wrong_item', label: 'Wrong item received', requireReturn: true, autoApprove: true },
        { id: 'damaged', label: 'Damaged in shipping', requireReturn: false, autoApprove: true },
        { id: 'not_as_described', label: 'Not as described', requireReturn: true, autoApprove: false },
        { id: 'changed_mind', label: 'Changed my mind', requireReturn: true, autoApprove: false, restockingFee: 15 },
      ],
      shippingConfig: {
        defaultPaidBy: 'CONDITIONAL',
        companyPaidReasons: ['DEFECTIVE', 'DAMAGED_IN_SHIPPING', 'WRONG_ITEM'],
        labelProvider: 'shipstation',
        defaultCarrier: 'USPS',
        defaultServiceLevel: 'ground',
      },
      inspectionConfig: {
        required: true,
        requiredCategories: ['equipment', 'merchandise'],
        requiredAboveAmount: 50,
        maxInspectionDays: 5,
        autoPassBelow: 25,
      },
      resolutionConfig: {
        defaultResolution: 'refund',
        allowExchange: true,
        allowStoreCredit: true,
        storeCreditBonus: 10,
        exchangePriceDifference: 'charge',
      },
      notifications: {
        emailOnCreation: true,
        emailOnStatusChange: true,
        smsOnStatusChange: false,
      },
      automation: {
        autoSendLabel: true,
        autoCloseAfterDays: 45,
        reminderDays: [7, 14, 21],
      },
    },
  });

  console.log('  ✓ RMA Policy created');
}

// ═══════════════════════════════════════════════════════════════
// TERMS & CONDITIONS
// ═══════════════════════════════════════════════════════════════

async function seedTermsDocuments() {
  console.log('📜 Seeding Terms Documents...');

  const documents = [
    {
      id: 'terms_return_policy',
      type: 'REFUND_POLICY_DOC' as const,
      title: 'Return Policy',
      version: '1.0',
      status: 'TERMS_ACTIVE' as const,
      fullText: `# Coffee Explorer Return Policy

## 30-Day Satisfaction Guarantee
We want you to love your coffee. If you're not completely satisfied, you may return within 30 days for a full refund.

## Eligibility
- Products must be in original, unopened packaging
- Perishable items must be returned within 14 days
- Equipment must be in original condition

## How to Return
1. Request an RMA through your account
2. Receive a return shipping label
3. Package items securely and ship within 7 days
4. Refund processed within 5 business days

## Refund Methods
- Original payment method (5-7 business days)
- Store credit (immediate, with 10% bonus)`,
      sections: [
        { id: 'guarantee', title: '30-Day Guarantee', content: 'Full refund within 30 days' },
        { id: 'eligibility', title: 'Eligibility', content: 'Original packaging required' },
        { id: 'process', title: 'Return Process', content: '4-step return process' },
      ],
      language: 'en',
      readabilityScore: 75,
      wordCount: 150,
      estimatedReadTime: 1,
      effectiveDate: new Date('2024-01-01'),
    },
    {
      id: 'terms_subscription',
      type: 'SUBSCRIPTION_TERMS' as const,
      title: 'Subscription Terms',
      version: '1.0',
      status: 'TERMS_ACTIVE' as const,
      fullText: `# Coffee Explorer Subscription Terms

## Billing
- Subscriptions billed monthly on the same day
- 3-day advance notification before each charge

## Pausing & Skipping
- Pause for up to 90 days
- Skip individual shipments anytime
- Rewards preserved during pause

## Cancellation
- Cancel anytime with no penalty
- Unused credit can be refunded

## Price Changes
- 30-day notice before price increases
- Cancel before new price takes effect`,
      sections: [
        { id: 'billing', title: 'Billing', content: 'Monthly billing with notifications' },
        { id: 'pause', title: 'Pause/Skip', content: 'Flexible pause options' },
        { id: 'cancel', title: 'Cancellation', content: 'No penalty cancellation' },
      ],
      language: 'en',
      readabilityScore: 80,
      wordCount: 100,
      estimatedReadTime: 1,
      effectiveDate: new Date('2024-01-01'),
    },
  ];

  for (const doc of documents) {
    await prisma.termsDocument.upsert({
      where: { id: doc.id },
      update: {},
      create: {
        id: doc.id,
        companyId: COMPANY_ID,
        type: doc.type,
        title: doc.title,
        version: doc.version,
        status: doc.status,
        fullText: doc.fullText,
        sections: doc.sections,
        language: doc.language,
        readabilityScore: doc.readabilityScore,
        wordCount: doc.wordCount,
        estimatedReadTime: doc.estimatedReadTime,
        effectiveDate: doc.effectiveDate,
        publishedAt: new Date(),
      },
    });
  }

  console.log(`  ✓ ${documents.length} Terms Documents created`);
}

// ═══════════════════════════════════════════════════════════════
// CONTENT TEMPLATES
// ═══════════════════════════════════════════════════════════════

async function seedContentTemplates() {
  console.log('📝 Seeding Content Templates...');

  const templates = [
    {
      id: 'tpl_save_discount_email',
      name: 'Save Flow - Discount Offer Email',
      type: 'EMAIL',
      purpose: 'SAVE_FLOW',
      status: 'ACTIVE',
      subject: "Wait, {{first_name}}! Here's 20% off before you go",
      body: `Hi {{first_name}},

We noticed you're thinking about canceling. Before you go, we wanted to make sure you know how much we value you.

**You've explored {{products_explored}} amazing coffee origins!**

Here's an exclusive offer just for you:

✨ **20% off your next 3 months** ✨

[Claim Your Discount]

Your rewards balance of \${{rewards_balance}} will remain intact.

Warm regards,
The Coffee Explorer Team`,
      triggersApplied: ['LOSS_AVERSION', 'COMMITMENT_CONSISTENCY', 'ANCHORING'],
      variables: [
        { name: 'first_name', type: 'string', required: true, fallback: 'Coffee Lover' },
        { name: 'products_explored', type: 'number', required: false, fallback: '5' },
        { name: 'rewards_balance', type: 'currency', required: false, fallback: '0.00' },
      ],
      personalizationLevel: 'advanced',
      createdBy: 'system',
    },
    {
      id: 'tpl_winback_7day',
      name: 'Winback - 7 Day Email',
      type: 'EMAIL',
      purpose: 'WINBACK',
      status: 'ACTIVE',
      subject: "{{first_name}}, we miss you! Here's 25% off to come back",
      body: `Hi {{first_name}},

It's been a week since you left Coffee Explorer, and we miss having you!

**Come back today and get:**
- 25% off your next 3 months
- Your rewards balance restored
- A free premium sample

[Restart My Subscription - 25% Off]

P.S. This offer expires in 7 days!`,
      triggersApplied: ['LOSS_AVERSION', 'SCARCITY', 'URGENCY', 'RECIPROCITY'],
      variables: [
        { name: 'first_name', type: 'string', required: true, fallback: 'Coffee Lover' },
      ],
      personalizationLevel: 'advanced',
      createdBy: 'system',
    },
    {
      id: 'tpl_payment_failed',
      name: 'Payment Failed - Friendly Reminder',
      type: 'EMAIL',
      purpose: 'PAYMENT_RECOVERY',
      status: 'ACTIVE',
      subject: "{{first_name}}, quick heads up about your subscription",
      body: `Hi {{first_name}},

Quick heads up – we tried to process your subscription payment, but it didn't go through.

No worries! It might be:
- An expired card
- Temporary hold from your bank

**Your subscription is still active** – we'll try again in 3 days.

[Update Payment Method]

Thanks for being part of Coffee Explorer!`,
      triggersApplied: ['PATTERN_INTERRUPT', 'OWNERSHIP_VELOCITY'],
      variables: [
        { name: 'first_name', type: 'string', required: true, fallback: 'there' },
      ],
      personalizationLevel: 'basic',
      createdBy: 'system',
    },
    {
      id: 'tpl_save_sms',
      name: 'Save Flow - SMS',
      type: 'SMS',
      purpose: 'SAVE_FLOW',
      status: 'ACTIVE',
      subject: null,
      body: '{{first_name}}, before you cancel: Get 20% off your next 3 months! Your ${{rewards}} rewards are waiting. Tap to claim: {{link}}',
      triggersApplied: ['LOSS_AVERSION', 'URGENCY'],
      variables: [
        { name: 'first_name', type: 'string', required: true },
        { name: 'rewards', type: 'currency', required: false, fallback: '0' },
        { name: 'link', type: 'string', required: true },
      ],
      personalizationLevel: 'basic',
      createdBy: 'system',
    },
  ];

  for (const template of templates) {
    await prisma.contentTemplate.upsert({
      where: { id: template.id },
      update: {},
      create: {
        id: template.id,
        companyId: COMPANY_ID,
        name: template.name,
        type: template.type,
        purpose: template.purpose,
        status: template.status,
        subject: template.subject,
        body: template.body,
        triggersApplied: template.triggersApplied,
        variables: template.variables,
        personalizationLevel: template.personalizationLevel,
        aiGenerated: false,
        usageCount: 0,
        version: 1,
        createdBy: template.createdBy,
        publishedAt: new Date(),
      },
    });
  }

  console.log(`  ✓ ${templates.length} Content Templates created`);
}

// ═══════════════════════════════════════════════════════════════
// CONTENT GENERATION CONFIG
// ═══════════════════════════════════════════════════════════════

async function seedContentGenerationConfig() {
  console.log('🤖 Seeding Content Generation Configuration...');

  await prisma.contentGenerationConfig.upsert({
    where: { companyId: COMPANY_ID },
    update: {},
    create: {
      companyId: COMPANY_ID,
      providers: {
        primary: 'CLAUDE',
        fallback: 'OLLAMA',
        routingRules: [
          {
            id: 'rule_high_quality',
            conditions: { qualityRequired: 'high', personalized: true },
            provider: 'CLAUDE',
            priority: 1,
          },
          {
            id: 'rule_save_flow',
            conditions: { purpose: ['SAVE_FLOW', 'CANCEL_PREVENTION', 'WINBACK'] },
            provider: 'CLAUDE',
            priority: 2,
          },
          {
            id: 'rule_batch',
            conditions: { urgency: 'batch' },
            provider: 'OLLAMA',
            priority: 3,
          },
        ],
      },
      claude: {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.7,
        maxTokens: 1024,
        monthlyBudget: 100,
      },
      ollama: {
        model: 'llama3.1:8b',
        endpoint: 'http://localhost:11434',
        temperature: 0.7,
        maxTokens: 1024,
      },
      quality: {
        minQualityScore: 60,
        requireReview: false,
        reviewThreshold: 80,
        autoApprove: true,
        autoApproveMinScore: 75,
      },
      triggers: {
        autoApply: true,
        maxTriggersPerContent: 3,
        defaultTriggers: ['LOSS_AVERSION', 'SOCIAL_PROOF'],
        purposeTriggers: {
          SAVE_FLOW: ['LOSS_AVERSION', 'COMMITMENT_CONSISTENCY', 'PATTERN_INTERRUPT'],
          WINBACK: ['LOSS_AVERSION', 'SCARCITY', 'URGENCY'],
          ONBOARDING: ['FUTURE_PACING', 'IDENTITY_ALIGNMENT', 'OWNERSHIP_VELOCITY'],
        },
      },
      brandVoice: {
        tone: ['friendly', 'warm', 'knowledgeable', 'passionate'],
        personality: 'A knowledgeable coffee enthusiast who genuinely cares about helping you discover amazing coffee',
        avoidWords: ['cheap', 'buy now', 'act fast', 'limited time only'],
        preferredPhrases: ['discover', 'explore', 'curated for you', 'coffee journey'],
        styleGuide: `
- Use conversational, warm language
- Avoid pushy sales tactics
- Reference the customer's journey
- Personalize when possible`,
      },
      personalization: {
        enabled: true,
        dynamicContent: true,
        aiPersonalization: true,
      },
    },
  });

  console.log('  ✓ Content Generation Config created');
}

// ═══════════════════════════════════════════════════════════════
// SAMPLE CUSTOMER DATA
// ═══════════════════════════════════════════════════════════════

async function seedSampleCustomerData() {
  console.log('👤 Seeding Sample Customer Data...');

  const customers = [
    {
      id: 'cust_high_risk_jane',
      email: 'jane.doe@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      riskLevel: 'HIGH',
      signals: [
        { signalType: 'CANCEL_PAGE_VISIT', weight: 25 },
        { signalType: 'ENGAGEMENT_SCORE_DROP', weight: 20 },
        { signalType: 'NEGATIVE_FEEDBACK', weight: 20 },
      ],
    },
    {
      id: 'cust_medium_risk_john',
      email: 'john.smith@example.com',
      firstName: 'John',
      lastName: 'Smith',
      riskLevel: 'MEDIUM',
      signals: [
        { signalType: 'SKIP_FREQUENCY_INCREASE', weight: 15 },
        { signalType: 'HELP_PAGE_VISITS', weight: 10 },
      ],
    },
    {
      id: 'cust_low_risk_emily',
      email: 'emily.jones@example.com',
      firstName: 'Emily',
      lastName: 'Jones',
      riskLevel: 'LOW',
      signals: [],
    },
  ];

  for (const cust of customers) {
    // Create customer
    await prisma.customer.upsert({
      where: { id: cust.id },
      update: {},
      create: {
        id: cust.id,
        companyId: COMPANY_ID,
        email: cust.email,
        firstName: cust.firstName,
        lastName: cust.lastName,
        status: 'ACTIVE',
      },
    });

    // Create churn signals
    for (const signal of cust.signals) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      await prisma.churnSignal.create({
        data: {
          customerId: cust.id,
          signalType: signal.signalType,
          weight: signal.weight,
          value: 'detected',
          confidence: 0.8,
          decayDays: 14,
          detectedAt: new Date(),
          expiresAt,
        },
      });
    }

    // Create risk score
    const totalScore = cust.signals.reduce((sum, s) => sum + s.weight, 0);
    await prisma.churnRiskScore.upsert({
      where: { customerId: cust.id },
      update: {},
      create: {
        customerId: cust.id,
        companyId: COMPANY_ID,
        score: totalScore,
        riskLevel: cust.riskLevel,
        signalBreakdown: {
          engagement: cust.signals.filter(s => s.signalType.includes('ENGAGEMENT')).reduce((sum, s) => sum + s.weight, 0),
          payment: 0,
          behavior: cust.signals.filter(s => s.signalType.includes('SKIP')).reduce((sum, s) => sum + s.weight, 0),
          lifecycle: 0,
          external: 0,
        },
        trend: 'stable',
        trendDelta: 0,
        recommendedActions: totalScore > 40 ? ['save_flow', 'personal_outreach'] : [],
        calculatedAt: new Date(),
        nextCalculationAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`  ✓ ${customers.length} Sample Customers with Risk Data created`);
}

// ═══════════════════════════════════════════════════════════════
// RUN SEED
// ═══════════════════════════════════════════════════════════════

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
