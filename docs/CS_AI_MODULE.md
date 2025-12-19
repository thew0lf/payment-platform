# CS AI Module - Technical Documentation

## Overview

The CS AI (Customer Service AI) module provides intelligent, tiered customer service automation with voice and chat support. It integrates with the Momentum Intelligence platform and uses a three-tier escalation system: AI_REP → AI_MANAGER → HUMAN_AGENT.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CS AI System                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │   AI_REP     │───►│  AI_MANAGER  │───►│ HUMAN_AGENT  │           │
│  │   (Tier 1)   │    │   (Tier 2)   │    │   (Tier 3)   │           │
│  │  $0.50/min   │    │  $0.75/min   │    │  $1.50/min   │           │
│  └──────────────┘    └──────────────┘    └──────────────┘           │
│         │                   │                   │                    │
│         └───────────────────┴───────────────────┘                    │
│                             │                                        │
│  ┌──────────────────────────┴──────────────────────────┐            │
│  │              Communication Channels                   │            │
│  │    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────┐ │            │
│  │    │  Voice  │  │   Chat  │  │  Email  │  │  SMS  │ │            │
│  │    │ (Twilio)│  │  (Web)  │  │ (SES)   │  │ (SNS) │ │            │
│  │    └─────────┘  └─────────┘  └─────────┘  └───────┘ │            │
│  └─────────────────────────────────────────────────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### CS AI Controller (`/api/momentum/cs`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/sessions` | List CS sessions with filters | Yes |
| GET | `/sessions/:id` | Get session details with messages | Yes |
| POST | `/sessions` | Start new session | Yes |
| PATCH | `/sessions/:id/escalate` | Escalate to next tier | Yes |
| PATCH | `/sessions/:id/resolve` | Resolve session | Yes |
| POST | `/sessions/:id/messages` | Send message in session | Yes |
| GET | `/analytics` | Get CS AI analytics | Yes |
| GET | `/queue` | Get queue stats | Yes |
| GET | `/usage` | Get usage/billing data | Yes |
| GET | `/pricing` | Get pricing configuration | Yes |

### Voice AI Controller (`/api/momentum/voice`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/calls` | List voice calls with filters | Yes |
| GET | `/calls/:id` | Get call details with transcript | Yes |
| POST | `/calls/initiate` | Initiate outbound call | Yes |
| GET | `/scripts` | List voice scripts | Yes |
| POST | `/scripts` | Create voice script | Yes |
| PATCH | `/scripts/:id` | Update voice script | Yes |
| GET | `/stats` | Get voice AI stats | Yes |
| GET | `/twilio-status` | Check Twilio integration status | Yes |

### Twilio Webhooks (Public - No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/inbound` | Handle inbound calls |
| POST | `/webhooks/speech` | Handle speech recognition results |
| POST | `/webhooks/status-callback` | Handle call status updates |
| POST | `/webhooks/escalate/:callSid` | Handle escalation to human |

## Database Models

### CS Sessions (`cs_sessions`)

```prisma
model CSSession {
  id                   String          @id @default(cuid())
  companyId            String
  customerId           String
  channel              String          // voice, chat, email, sms
  currentTier          CSTier          @default(AI_REP)
  status               CSSessionStatus @default(ACTIVE)
  issueCategory        String?
  issueSummary         String?
  customerSentiment    String          @default("NEUTRAL")
  sentimentHistory     Json            @default("[]")
  escalationHistory    Json            @default("[]")
  context              Json?
  resolutionType       String?
  resolutionSummary    String?
  resolutionActions    Json?
  customerSatisfaction Int?
  followUpRequired     Boolean         @default(false)
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt
  resolvedAt           DateTime?
}
```

### CS Messages (`cs_messages`)

```prisma
model CSMessage {
  id        String   @id @default(cuid())
  sessionId String
  role      String   // customer, ai_rep, ai_manager, human_agent, system
  content   String   @db.Text
  sentiment String?
  metadata  Json?
  createdAt DateTime @default(now())
}
```

### Voice Calls (`voice_calls`)

```prisma
model VoiceCall {
  id                  String           @id @default(cuid())
  companyId           String
  customerId          String
  twilioCallSid       String           @unique
  direction           CallDirection    // INBOUND, OUTBOUND
  fromNumber          String
  toNumber            String
  initiatedAt         DateTime
  answeredAt          DateTime?
  endedAt             DateTime?
  duration            Int?             // seconds
  scriptId            String
  transcriptRaw       String?          @db.Text
  transcriptProcessed Json?
  overallSentiment    Sentiment?
  detectedIntents     String[]
  keyMoments          Json?
  status              VoiceCallStatus  @default(INITIATED)
  outcome             CallOutcome?
  escalatedToHuman    Boolean          @default(false)
  escalationReason    String?
  qualityScore        Float?
}
```

### CS AI Billing Models

```prisma
model CSAIUsage {
  id              String       @id @default(cuid())
  companyId       String
  clientId        String
  csSessionId     String?
  voiceCallId     String?
  usageType       CSAIUsageType
  tier            CSTier
  channel         String
  durationSeconds Int?
  messageCount    Int          @default(0)
  aiMessageCount  Int          @default(0)
  inputTokens     Int          @default(0)
  outputTokens    Int          @default(0)
  twilioMinutes   Decimal?
  twilioCostCents Int?
  baseCost        Int
  markupCost      Int
  totalCost       Int
  billingPeriod   String
  occurredAt      DateTime
}

model CSAIPricing {
  id                         String @id @default(cuid())
  organizationId             String @unique
  voicePerMinuteCents        Int    @default(50)  // $0.50/min
  chatPerMessageCents        Int    @default(5)   // $0.05/message
  chatPerSessionCents        Int    @default(100) // $1.00/session
  inputTokenPrice            Int    @default(3)   // $0.03 per 1K
  outputTokenPrice           Int    @default(15)  // $0.15 per 1K
  aiRepMultiplier            Float  @default(1.0)
  aiManagerMultiplier        Float  @default(1.5)
  humanAgentMultiplier       Float  @default(3.0)
  monthlyMinutesAllowance    Int    @default(100)
  monthlyMessagesAllowance   Int    @default(500)
  overageVoicePerMinuteCents Int    @default(75)
  overageChatPerMessageCents Int    @default(8)
  csAIEnabled                Boolean @default(true)
}
```

## Enums

```prisma
enum CSTier {
  AI_REP
  AI_MANAGER
  HUMAN_AGENT
}

enum CSSessionStatus {
  ACTIVE
  RESOLVED
  ESCALATED
  ABANDONED
}

enum VoiceCallStatus {
  INITIATED
  RINGING
  IN_PROGRESS
  COMPLETED
  FAILED
  NO_ANSWER
  BUSY
}

enum CallOutcome {
  SAVED
  OFFER_ACCEPTED
  DECLINED
  ESCALATED_TO_HUMAN
  CALLBACK_SCHEDULED
  DISCONNECTED
}

enum CallDirection {
  INBOUND
  OUTBOUND
}

enum CSAIUsageType {
  CHAT_SESSION
  VOICE_CALL
  EMAIL_RESPONSE
  SMS_RESPONSE
}
```

## Frontend Pages

### Dashboard (`/cs-ai`)

Main CS AI dashboard showing:
- Total Sessions count
- Resolution Rate percentage
- Tier distribution (AI Rep, AI Manager, Human) with progress bars
- Escalations This Week list

### Sessions (`/cs-ai/sessions`)

- List all CS sessions with filters
- Search by customer name/email
- Filter by status, tier, channel
- Click to view session details

### Calls (`/cs-ai/calls`)

- List all voice calls
- Filter by direction, status, outcome
- View transcripts and sentiment analysis
- Initiate outbound calls

### Scripts (`/cs-ai/scripts`)

- Manage voice AI scripts
- Create/edit conversation flows
- Test script responses

### Billing (`/cs-ai/billing`)

- View usage summaries
- Track costs by tier and channel
- Monitor allowance usage
- View billing period details

## Frontend API Client

```typescript
// apps/admin-dashboard/src/lib/api/cs-ai.ts

export const csAiApi = {
  startSession: (data: StartSessionRequest) =>
    api.post('/momentum/cs/sessions', data),

  sendMessage: (sessionId: string, data: SendMessageRequest) =>
    api.post(`/momentum/cs/sessions/${sessionId}/messages`, data),

  getSession: (sessionId: string) =>
    api.get(`/momentum/cs/sessions/${sessionId}`),

  getSessions: (params?: SessionFilters) =>
    api.get('/momentum/cs/sessions', { params }),

  escalateSession: (sessionId: string) =>
    api.patch(`/momentum/cs/sessions/${sessionId}/escalate`),

  resolveSession: (sessionId: string, data: ResolveSessionRequest) =>
    api.patch(`/momentum/cs/sessions/${sessionId}/resolve`, data),

  getAnalytics: () =>
    api.get('/momentum/cs/analytics'),

  getQueueStats: () =>
    api.get('/momentum/cs/queue'),
};

export const voiceAiApi = {
  initiateCall: (data: InitiateCallRequest) =>
    api.post('/momentum/voice/calls/initiate', data),

  getCalls: (params?: CallFilters) =>
    api.get('/momentum/voice/calls', { params }),

  getCall: (callId: string) =>
    api.get(`/momentum/voice/calls/${callId}`),

  getScripts: () =>
    api.get('/momentum/voice/scripts'),

  createScript: (data: CreateScriptRequest) =>
    api.post('/momentum/voice/scripts', data),

  updateScript: (scriptId: string, data: UpdateScriptRequest) =>
    api.patch(`/momentum/voice/scripts/${scriptId}`, data),

  checkTwilioStatus: () =>
    api.get('/momentum/voice/twilio-status'),
};
```

## Backend Structure

```
apps/api/src/momentum-intelligence/
├── cs-ai/
│   ├── cs-ai.controller.ts      # Main CS AI controller
│   ├── cs-ai.module.ts          # Module definition
│   └── index.ts                 # Exports
├── voice-ai/
│   ├── voice-ai.controller.ts   # Voice AI + Twilio webhooks
│   ├── voice-ai.module.ts       # Module definition
│   └── index.ts                 # Exports
├── customer-service/
│   ├── customer-service.service.ts  # Core business logic
│   └── index.ts
└── momentum-intelligence.module.ts  # Parent module
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `apps/api/src/momentum-intelligence/cs-ai/cs-ai.controller.ts` | CS AI API endpoints |
| `apps/api/src/momentum-intelligence/voice-ai/voice-ai.controller.ts` | Voice AI + webhooks |
| `apps/api/src/momentum-intelligence/customer-service/customer-service.service.ts` | Business logic |
| `apps/admin-dashboard/src/lib/api/cs-ai.ts` | Frontend API client |
| `apps/admin-dashboard/src/app/(dashboard)/cs-ai/page.tsx` | Dashboard page |
| `apps/admin-dashboard/e2e/cs-ai.spec.ts` | E2E tests |
| `apps/api/prisma/seeds/demo/seed-cs-ai.ts` | Seed data |

## Seed Data

The CS AI seed (`seed-cs-ai.ts`) creates:

1. **CS AI Pricing** - Organization-level pricing configuration
2. **Voice Calls** - 10 sample calls with various statuses and outcomes
3. **CS Sessions** - 8 sample chat sessions with messages
4. **CS AI Usage** - Usage records linked to sessions and calls
5. **Usage Summary** - Monthly billing summary

Run seeds:
```bash
cd apps/api && npx prisma db seed
```

## Deployment

CS AI is part of the API service and deploys via the existing CI/CD pipeline:

1. Push to `main` branch on `apps/api/**`
2. GitHub Actions runs tests and builds Docker image
3. Image pushed to ECR
4. ECS service updated
5. Health check verifies deployment

Manual deployment:
```bash
gh workflow run deploy-api.yml
```

## Twilio Integration

### Required Environment Variables

```bash
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+18001234567
TWILIO_WEBHOOK_URL=https://api.avnz.io/api/momentum/voice/webhooks
```

### Webhook Configuration

Configure in Twilio Console:
- Voice URL: `https://api.avnz.io/api/momentum/voice/webhooks/inbound`
- Status Callback: `https://api.avnz.io/api/momentum/voice/webhooks/status-callback`

## Testing

### E2E Tests

```bash
cd apps/admin-dashboard && npx playwright test e2e/cs-ai.spec.ts
```

### Manual Testing

1. Login to admin dashboard
2. Navigate to CS AI Dashboard (`/cs-ai`)
3. Verify stats display correctly
4. Test session list and filters
5. Test call list and transcripts
6. Verify billing data displays

## Pricing Model

| Service | Base Rate | AI Manager (1.5x) | Human Agent (3x) |
|---------|-----------|-------------------|------------------|
| Voice | $0.50/min | $0.75/min | $1.50/min |
| Chat Session | $1.00/session | $1.50/session | $3.00/session |
| Chat Message | $0.05/msg | $0.075/msg | $0.15/msg |

### Monthly Allowances (Included)
- 100 voice minutes
- 500 chat messages

### Overage Rates
- Voice: $0.75/min
- Chat: $0.08/message

---

*Last Updated: December 19, 2025*
