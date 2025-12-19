import { PrismaClient } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// CS AI SEED DATA
// Seeds Voice Calls, CS Sessions, and Billing Usage for demo
// ═══════════════════════════════════════════════════════════════

export async function seedCSAI(prisma: PrismaClient) {
  console.log('🤖 Seeding CS AI data...\n');

  // Find the company to seed data for
  const company = await prisma.company.findFirst({
    where: { slug: 'coffee-co' },
    include: { client: true },
  });

  if (!company) {
    console.log('⚠️ Company "coffee-co" not found. Skipping CS AI seed.');
    return;
  }

  const COMPANY_ID = company.id;
  const CLIENT_ID = company.clientId;
  const ORGANIZATION_ID = company.client.organizationId;
  console.log(`📍 Using company: ${company.name} (${COMPANY_ID})\n`);

  // Get existing customers for reference
  const customers = await prisma.customer.findMany({
    where: { companyId: COMPANY_ID },
    take: 10,
  });

  if (customers.length === 0) {
    console.log('⚠️ No customers found. Skipping CS AI seed.');
    return;
  }

  console.log(`📍 Found ${customers.length} customers\n`);

  // Seed in order
  await seedCSAIPricing(prisma, ORGANIZATION_ID);
  await seedVoiceCalls(prisma, COMPANY_ID, customers);
  await seedCSSessions(prisma, COMPANY_ID, customers);
  await seedCSAIUsage(prisma, COMPANY_ID, CLIENT_ID);
  await seedCSAIUsageSummary(prisma, COMPANY_ID, CLIENT_ID);

  console.log('\n✅ CS AI seed complete!');
}

// ═══════════════════════════════════════════════════════════════
// CS AI PRICING
// ═══════════════════════════════════════════════════════════════

async function seedCSAIPricing(prisma: PrismaClient, organizationId: string) {
  console.log('💰 Seeding CS AI Pricing...');

  await prisma.cSAIPricing.upsert({
    where: { organizationId },
    update: {},
    create: {
      organizationId,
      voicePerMinuteCents: 50, // $0.50/min
      chatPerMessageCents: 5, // $0.05/message
      chatPerSessionCents: 100, // $1.00/session
      inputTokenPrice: 3, // $0.03 per 1K
      outputTokenPrice: 15, // $0.15 per 1K
      aiRepMultiplier: 1.0,
      aiManagerMultiplier: 1.5,
      humanAgentMultiplier: 3.0,
      monthlyMinutesAllowance: 100,
      monthlyMessagesAllowance: 500,
      overageVoicePerMinuteCents: 75,
      overageChatPerMessageCents: 8,
      csAIEnabled: true,
    },
  });

  console.log('  ✓ CS AI Pricing configured');
}

// ═══════════════════════════════════════════════════════════════
// VOICE CALLS
// ═══════════════════════════════════════════════════════════════

async function seedVoiceCalls(prisma: PrismaClient, companyId: string, customers: any[]) {
  console.log('📞 Seeding Voice Calls...');

  // CallOutcome: SAVED, OFFER_ACCEPTED, DECLINED, ESCALATED_TO_HUMAN, CALLBACK_SCHEDULED, DISCONNECTED
  const callData = [
    { direction: 'INBOUND' as const, status: 'COMPLETED' as const, outcome: 'OFFER_ACCEPTED' as const, duration: 245, sentiment: 'POSITIVE' as const, intents: ['subscription_inquiry', 'product_info'], escalated: false },
    { direction: 'OUTBOUND' as const, status: 'COMPLETED' as const, outcome: 'SAVED' as const, duration: 420, sentiment: 'NEUTRAL' as const, intents: ['cancellation_request', 'billing_question'], escalated: false },
    { direction: 'INBOUND' as const, status: 'COMPLETED' as const, outcome: 'ESCALATED_TO_HUMAN' as const, duration: 180, sentiment: 'NEGATIVE' as const, intents: ['complaint', 'refund_request'], escalated: true },
    { direction: 'INBOUND' as const, status: 'COMPLETED' as const, outcome: 'OFFER_ACCEPTED' as const, duration: 312, sentiment: 'POSITIVE' as const, intents: ['order_status', 'shipping_inquiry'], escalated: false },
    { direction: 'OUTBOUND' as const, status: 'COMPLETED' as const, outcome: 'SAVED' as const, duration: 198, sentiment: 'POSITIVE' as const, intents: ['follow_up', 'satisfaction_survey'], escalated: false },
    { direction: 'INBOUND' as const, status: 'IN_PROGRESS' as const, outcome: null, duration: null, sentiment: null, intents: [], escalated: false },
    { direction: 'INBOUND' as const, status: 'COMPLETED' as const, outcome: 'SAVED' as const, duration: 567, sentiment: 'NEUTRAL' as const, intents: ['cancellation_request', 'discount_inquiry'], escalated: true },
    { direction: 'OUTBOUND' as const, status: 'COMPLETED' as const, outcome: 'CALLBACK_SCHEDULED' as const, duration: 145, sentiment: 'POSITIVE' as const, intents: ['appointment_reminder', 'confirmation'], escalated: false },
    { direction: 'INBOUND' as const, status: 'FAILED' as const, outcome: 'DISCONNECTED' as const, duration: 0, sentiment: null, intents: [], escalated: false },
    { direction: 'INBOUND' as const, status: 'COMPLETED' as const, outcome: 'OFFER_ACCEPTED' as const, duration: 389, sentiment: 'POSITIVE' as const, intents: ['product_recommendation', 'upsell_acceptance'], escalated: false },
  ];

  for (let i = 0; i < callData.length; i++) {
    const call = callData[i];
    const customer = customers[i % customers.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const initiatedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const answeredAt = call.status !== 'FAILED' ? new Date(initiatedAt.getTime() + 3000) : null;
    const endedAt = call.duration ? new Date(initiatedAt.getTime() + call.duration * 1000) : null;

    await prisma.voiceCall.create({
      data: {
        companyId,
        customerId: customer.id,
        twilioCallSid: `CA${Date.now()}${i}${Math.random().toString(36).substr(2, 9)}`,
        direction: call.direction,
        fromNumber: call.direction === 'INBOUND' ? '+14155551234' : '+18005551234',
        toNumber: call.direction === 'INBOUND' ? '+18005551234' : '+14155551234',
        initiatedAt,
        answeredAt,
        endedAt,
        duration: call.duration,
        scriptId: 'default_script',
        transcriptRaw: call.status === 'COMPLETED' ? generateTranscript(call.intents) : null,
        transcriptProcessed: call.status === 'COMPLETED' ? { intents: call.intents, segments: [] } : null,
        overallSentiment: call.sentiment,
        detectedIntents: call.intents,
        keyMoments: call.status === 'COMPLETED' ? generateKeyMoments(call.intents) : null,
        status: call.status,
        outcome: call.outcome,
        outcomeDetails: call.outcome ? { reason: call.outcome, notes: 'Demo data' } : null,
        offersPresented: call.outcome === 'SAVED' ? [{ type: 'discount', value: '20%' }] : null,
        offerAccepted: call.outcome === 'SAVED' ? { type: 'discount', value: '20%' } : null,
        escalatedToHuman: call.escalated,
        escalationReason: call.escalated ? 'Customer requested human agent' : null,
        qualityScore: call.status === 'COMPLETED' ? 70 + Math.random() * 30 : null,
      },
    });
  }

  console.log(`  ✓ Created ${callData.length} voice calls`);
}

function generateTranscript(intents: string[]): string {
  const greetings = [
    "Agent: Thank you for calling Coffee Co. How can I help you today?",
    "Customer: Hi, I have a question about my subscription.",
  ];

  const responses: Record<string, string[]> = {
    subscription_inquiry: [
      "Agent: I'd be happy to help with your subscription. Let me pull up your account.",
      "Agent: I can see your monthly coffee subscription here. What would you like to know?",
    ],
    product_info: [
      "Agent: Great question! Our Ethiopian blend is one of our most popular options.",
      "Customer: That sounds interesting. Is it available in decaf?",
    ],
    cancellation_request: [
      "Customer: I'm thinking about canceling my subscription.",
      "Agent: I understand. Before you go, could I ask what's prompting this decision?",
    ],
    billing_question: [
      "Customer: I noticed an extra charge on my account.",
      "Agent: Let me look into that for you right away.",
    ],
    order_status: [
      "Customer: Where's my order? It was supposed to arrive yesterday.",
      "Agent: I apologize for the delay. Let me check the tracking for you.",
    ],
    complaint: [
      "Customer: I'm really not happy with the last batch I received.",
      "Agent: I'm so sorry to hear that. Let me make this right for you.",
    ],
    refund_request: [
      "Customer: I'd like a refund please.",
      "Agent: I understand. Let me process that for you.",
    ],
  };

  let transcript = greetings.join('\n');
  for (const intent of intents) {
    if (responses[intent]) {
      transcript += '\n' + responses[intent].join('\n');
    }
  }
  transcript += "\nAgent: Is there anything else I can help you with today?\nCustomer: No, that's all. Thank you!\nAgent: Thank you for being a Coffee Co customer. Have a great day!";

  return transcript;
}

function generateKeyMoments(intents: string[]): any {
  return {
    moments: intents.map((intent, i) => ({
      timestamp: 30 + i * 45,
      type: intent,
      description: `Customer discussed ${intent.replace('_', ' ')}`,
      sentiment: i === 0 ? 'neutral' : 'positive',
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// CS SESSIONS (Chat)
// ═══════════════════════════════════════════════════════════════

async function seedCSSessions(prisma: PrismaClient, companyId: string, customers: any[]) {
  console.log('💬 Seeding CS Sessions...');

  const sessionData = [
    { status: 'RESOLVED' as const, tier: 'AI_REP' as const, sentiment: 'POSITIVE', resolved: true },
    { status: 'RESOLVED' as const, tier: 'AI_REP' as const, sentiment: 'POSITIVE', resolved: true },
    { status: 'RESOLVED' as const, tier: 'AI_MANAGER' as const, sentiment: 'NEUTRAL', resolved: true },
    { status: 'ESCALATED' as const, tier: 'HUMAN_AGENT' as const, sentiment: 'NEGATIVE', resolved: false },
    { status: 'ACTIVE' as const, tier: 'AI_REP' as const, sentiment: 'NEUTRAL', resolved: false },
    { status: 'RESOLVED' as const, tier: 'AI_REP' as const, sentiment: 'POSITIVE', resolved: true },
    { status: 'RESOLVED' as const, tier: 'AI_MANAGER' as const, sentiment: 'POSITIVE', resolved: true },
    { status: 'ABANDONED' as const, tier: 'AI_REP' as const, sentiment: 'NEUTRAL', resolved: false },
  ];

  for (let i = 0; i < sessionData.length; i++) {
    const session = sessionData[i];
    const customer = customers[i % customers.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const resolvedAt = session.resolved ? new Date(createdAt.getTime() + (5 + Math.random() * 10) * 60 * 1000) : null;

    const csSession = await prisma.cSSession.create({
      data: {
        companyId,
        customerId: customer.id,
        channel: 'chat',
        currentTier: session.tier,
        status: session.status,
        createdAt,
        resolvedAt,
        customerSentiment: session.sentiment,
        sentimentHistory: [{ time: createdAt.toISOString(), sentiment: session.sentiment }],
        escalationHistory: session.tier === 'HUMAN_AGENT' ? [{ time: new Date(createdAt.getTime() + 3 * 60 * 1000).toISOString(), reason: 'Customer escalation request' }] : [],
        context: { browser: 'Chrome', platform: 'Web', referrer: 'https://coffee-co.com' },
        resolutionType: session.resolved ? 'resolved' : null,
        resolutionSummary: session.resolved ? 'Issue resolved successfully' : null,
        customerSatisfaction: session.resolved ? 4 + Math.floor(Math.random() * 2) : null,
      },
    });

    // Add messages
    const messages = generateChatMessages(session.tier, session.status);
    for (const msg of messages) {
      await prisma.cSMessage.create({
        data: {
          sessionId: csSession.id,
          role: msg.role,
          content: msg.content,
          sentiment: msg.role === 'customer' ? session.sentiment : 'NEUTRAL',
          metadata: { intent: msg.intent || null },
        },
      });
    }
  }

  console.log(`  ✓ Created ${sessionData.length} CS sessions with messages`);
}

function generateChatMessages(tier: string, status: string): { role: string; content: string; intent?: string }[] {
  const messages = [
    { role: 'customer', content: 'Hi, I need help with my order', intent: 'order_inquiry' },
    { role: 'ai_rep', content: "Hello! I'd be happy to help you with your order. Could you please provide your order number?" },
    { role: 'customer', content: "It's ORD-12345", intent: 'order_reference' },
    { role: 'ai_rep', content: 'Thank you! I found your order. It looks like your Ethiopian Dark Roast is currently being prepared for shipment.' },
  ];

  if (tier === 'AI_MANAGER' || tier === 'HUMAN_AGENT') {
    messages.push(
      { role: 'customer', content: "I've been waiting for a week now. This is unacceptable.", intent: 'complaint' },
      { role: tier === 'HUMAN_AGENT' ? 'human_agent' : 'ai_manager', content: 'I completely understand your frustration, and I sincerely apologize for the delay. Let me escalate this to ensure we resolve it quickly.' }
    );
  }

  if (status === 'RESOLVED') {
    messages.push(
      { role: tier === 'HUMAN_AGENT' ? 'human_agent' : 'ai_rep', content: "I've expedited your shipment and added a complimentary bag of our new blend as an apology. You should receive tracking within the hour." },
      { role: 'customer', content: "Thank you so much! That's great customer service.", intent: 'satisfaction' }
    );
  }

  return messages;
}

// ═══════════════════════════════════════════════════════════════
// CS AI USAGE
// ═══════════════════════════════════════════════════════════════

async function seedCSAIUsage(prisma: PrismaClient, companyId: string, clientId: string) {
  console.log('📊 Seeding CS AI Usage records...');

  // Get the seeded voice calls and sessions
  const voiceCalls = await prisma.voiceCall.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const csSessions = await prisma.cSSession.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 8,
  });

  // Create usage records for voice calls
  for (const call of voiceCalls) {
    if (call.duration && call.duration > 0) {
      const tier = call.escalatedToHuman ? 'HUMAN_AGENT' : 'AI_REP';
      const multiplier = tier === 'HUMAN_AGENT' ? 3.0 : 1.0;
      const baseCost = Math.round((call.duration / 60) * 50); // $0.50/min base
      const totalCost = Math.round(baseCost * multiplier);

      await prisma.cSAIUsage.create({
        data: {
          companyId,
          clientId,
          voiceCallId: call.id,
          usageType: 'VOICE_CALL',
          tier: tier as any,
          channel: 'voice',
          durationSeconds: call.duration,
          twilioMinutes: call.duration / 60,
          twilioCostCents: Math.round((call.duration / 60) * 2), // ~$0.02/min Twilio cost
          baseCost,
          markupCost: totalCost - baseCost,
          totalCost,
          billingPeriod: new Date().toISOString().slice(0, 7),
          occurredAt: call.initiatedAt,
        },
      });
    }
  }

  // Create usage records for chat sessions
  for (const session of csSessions) {
    const messageCount = await prisma.cSMessage.count({
      where: { sessionId: session.id },
    });

    const aiMessageCount = await prisma.cSMessage.count({
      where: { sessionId: session.id, role: { not: 'customer' } },
    });

    const tier = session.currentTier;
    const multiplier = tier === 'HUMAN_AGENT' ? 3.0 : tier === 'AI_MANAGER' ? 1.5 : 1.0;
    const baseCost = 100 + messageCount * 5; // $1 session + $0.05/message
    const totalCost = Math.round(baseCost * multiplier);

    await prisma.cSAIUsage.create({
      data: {
        companyId,
        clientId,
        csSessionId: session.id,
        usageType: 'CHAT_SESSION',
        tier: tier as any,
        channel: 'chat',
        messageCount,
        aiMessageCount,
        inputTokens: aiMessageCount * 50,
        outputTokens: aiMessageCount * 120,
        baseCost,
        markupCost: totalCost - baseCost,
        totalCost,
        billingPeriod: new Date().toISOString().slice(0, 7),
        occurredAt: session.createdAt,
      },
    });
  }

  console.log(`  ✓ Created ${voiceCalls.length + csSessions.length} usage records`);
}

// ═══════════════════════════════════════════════════════════════
// CS AI USAGE SUMMARY
// ═══════════════════════════════════════════════════════════════

async function seedCSAIUsageSummary(prisma: PrismaClient, companyId: string, clientId: string) {
  console.log('📈 Seeding CS AI Usage Summary...');

  // Calculate summary for current month
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const usageRecords = await prisma.cSAIUsage.findMany({
    where: {
      companyId,
      occurredAt: { gte: periodStart, lte: periodEnd },
    },
  });

  let totalVoiceMinutes = 0;
  let totalVoiceCalls = 0;
  let voiceCostCents = 0;
  let totalChatSessions = 0;
  let totalChatMessages = 0;
  let chatCostCents = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let aiRepMinutes = 0;
  let aiManagerMinutes = 0;
  let humanAgentMinutes = 0;

  for (const usage of usageRecords) {
    if (usage.usageType === 'VOICE_CALL') {
      totalVoiceCalls++;
      const minutes = (usage.durationSeconds || 0) / 60;
      totalVoiceMinutes += minutes;
      voiceCostCents += usage.totalCost;

      if (usage.tier === 'AI_REP') aiRepMinutes += minutes;
      else if (usage.tier === 'AI_MANAGER') aiManagerMinutes += minutes;
      else humanAgentMinutes += minutes;
    } else if (usage.usageType === 'CHAT_SESSION') {
      totalChatSessions++;
      totalChatMessages += usage.messageCount;
      chatCostCents += usage.totalCost;
      totalInputTokens += usage.inputTokens;
      totalOutputTokens += usage.outputTokens;
    }
  }

  const totalCost = voiceCostCents + chatCostCents;
  const aiTokenCostCents = Math.round((totalInputTokens * 0.003 + totalOutputTokens * 0.015) / 10); // Per 1K tokens

  await prisma.cSAIUsageSummary.upsert({
    where: {
      companyId_periodStart: {
        companyId,
        periodStart,
      },
    },
    update: {
      totalVoiceMinutes,
      totalVoiceCalls,
      voiceCostCents,
      totalChatSessions,
      totalChatMessages,
      chatCostCents,
      totalInputTokens,
      totalOutputTokens,
      aiTokenCostCents,
      aiRepMinutes,
      aiManagerMinutes,
      humanAgentMinutes,
      totalBaseCost: Math.round(totalCost * 0.7),
      totalMarkupCost: Math.round(totalCost * 0.3),
      totalCost,
      allowanceUsedMinutes: Math.min(Math.round(totalVoiceMinutes), 100),
      allowanceUsedMessages: Math.min(totalChatMessages, 500),
      overageMinutes: Math.max(0, Math.round(totalVoiceMinutes) - 100),
      overageMessages: Math.max(0, totalChatMessages - 500),
    },
    create: {
      companyId,
      clientId,
      periodStart,
      periodEnd,
      totalVoiceMinutes,
      totalVoiceCalls,
      voiceCostCents,
      totalChatSessions,
      totalChatMessages,
      chatCostCents,
      totalInputTokens,
      totalOutputTokens,
      aiTokenCostCents,
      aiRepMinutes,
      aiManagerMinutes,
      humanAgentMinutes,
      totalBaseCost: Math.round(totalCost * 0.7),
      totalMarkupCost: Math.round(totalCost * 0.3),
      totalCost,
      allowanceUsedMinutes: Math.min(Math.round(totalVoiceMinutes), 100),
      allowanceUsedMessages: Math.min(totalChatMessages, 500),
      overageMinutes: Math.max(0, Math.round(totalVoiceMinutes) - 100),
      overageMessages: Math.max(0, totalChatMessages - 500),
    },
  });

  console.log(`  ✓ Created usage summary for ${periodStart.toISOString().slice(0, 7)}`);
  console.log(`    Voice: ${totalVoiceCalls} calls, ${totalVoiceMinutes.toFixed(1)} minutes, $${(voiceCostCents / 100).toFixed(2)}`);
  console.log(`    Chat: ${totalChatSessions} sessions, ${totalChatMessages} messages, $${(chatCostCents / 100).toFixed(2)}`);
  console.log(`    Total: $${(totalCost / 100).toFixed(2)}`);
}
