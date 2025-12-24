# Customer Service AI API Documentation

**Version:** 1.0
**Date:** December 19, 2025

---

## Overview

The Customer Service AI module provides an intelligent two-tier AI customer service system with Claude AI integration. It supports:

- **AI Rep (Tier 1):** First-line support handling routine inquiries
- **AI Manager (Tier 2):** Escalated issues requiring more authority
- **Human Agent (Tier 3):** Final escalation for complex cases

---

## Base URL

```
Production: https://api.avnz.io/api/momentum/cs
Staging: https://staging-api.avnz.io/api/momentum/cs
```

---

## Authentication

All endpoints require JWT authentication via Bearer token:

```
Authorization: Bearer <token>
```

---

## Session Management

### Start a CS Session

Creates a new customer service session.

**Endpoint:** `POST /sessions`

**Request Body:**
```json
{
  "companyId": "uuid",
  "customerId": "uuid",
  "channel": "chat",
  "initialMessage": "I need help with my order",
  "issueCategory": "SHIPPING",
  "metadata": {
    "source": "website"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `companyId` | string | Yes | Company UUID |
| `customerId` | string | Yes | Customer UUID |
| `channel` | enum | Yes | `voice`, `chat`, `email`, `sms` |
| `initialMessage` | string | No | Customer's first message |
| `issueCategory` | enum | No | See Issue Categories |
| `metadata` | object | No | Additional context |

**Response:** `201 Created`
```json
{
  "id": "sess_123",
  "companyId": "uuid",
  "customerId": "uuid",
  "channel": "chat",
  "currentTier": "AI_REP",
  "status": "ACTIVE",
  "customerSentiment": "NEUTRAL",
  "messages": [],
  "createdAt": "2025-12-19T12:00:00Z"
}
```

---

### Get Session

Retrieves a session by ID.

**Endpoint:** `GET /sessions/:id`

**Response:** `200 OK`
```json
{
  "id": "sess_123",
  "companyId": "uuid",
  "customerId": "uuid",
  "channel": "chat",
  "currentTier": "AI_REP",
  "status": "ACTIVE",
  "issueCategory": "SHIPPING",
  "issueSummary": "Customer inquiring about delayed shipment",
  "customerSentiment": "FRUSTRATED",
  "sentimentHistory": [
    {
      "sentiment": "NEUTRAL",
      "score": 0.5,
      "timestamp": "2025-12-19T12:00:00Z"
    },
    {
      "sentiment": "FRUSTRATED",
      "score": 0.3,
      "timestamp": "2025-12-19T12:05:00Z",
      "trigger": "shipment delay mentioned"
    }
  ],
  "escalationHistory": [],
  "messages": [
    {
      "id": "msg_1",
      "role": "customer",
      "content": "Where is my order?",
      "timestamp": "2025-12-19T12:00:00Z"
    },
    {
      "id": "msg_2",
      "role": "ai_rep",
      "content": "I'd be happy to help you track your order...",
      "timestamp": "2025-12-19T12:00:05Z",
      "metadata": {
        "aiGenerated": true,
        "model": "claude-sonnet-4-20250514",
        "tokens": {
          "input": 150,
          "output": 75
        },
        "latencyMs": 850
      }
    }
  ],
  "context": {
    "customer": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "tier": "GOLD",
      "lifetimeValue": 1500.00,
      "isVIP": false
    }
  },
  "createdAt": "2025-12-19T12:00:00Z",
  "updatedAt": "2025-12-19T12:05:00Z"
}
```

---

### List Sessions

Lists sessions with filtering.

**Endpoint:** `GET /sessions`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `companyId` | string | Filter by company (required) |
| `status` | enum | Filter by status |
| `tier` | enum | Filter by current tier |
| `customerId` | string | Filter by customer |
| `startDate` | string | Filter from date (ISO 8601) |
| `endDate` | string | Filter to date (ISO 8601) |
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |

**Response:** `200 OK`
```json
{
  "sessions": [...],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

## Message Handling

### Send Message

Sends a customer message and gets AI response.

**Endpoint:** `POST /sessions/:id/messages`

**Request Body:**
```json
{
  "message": "When will my order arrive?"
}
```

**Response:** `201 Created`
```json
{
  "customerMessage": {
    "id": "msg_3",
    "role": "customer",
    "content": "When will my order arrive?",
    "timestamp": "2025-12-19T12:10:00Z",
    "sentiment": "NEUTRAL"
  },
  "aiResponse": {
    "id": "msg_4",
    "role": "ai_rep",
    "content": "Based on the tracking information, your order ORD-123 is scheduled to arrive by December 21st...",
    "timestamp": "2025-12-19T12:10:02Z",
    "metadata": {
      "aiGenerated": true,
      "model": "claude-sonnet-4-20250514",
      "tokens": {
        "input": 280,
        "output": 95
      },
      "latencyMs": 920,
      "actionsTaken": ["order_lookup"],
      "suggestedActions": ["track_package"]
    }
  },
  "sessionUpdate": {
    "customerSentiment": "SATISFIED",
    "issueSummary": "Delivery date inquiry - resolved"
  }
}
```

---

## Escalation

### Escalate Session

Manually escalates a session to a higher tier.

**Endpoint:** `POST /sessions/:id/escalate`

**Request Body:**
```json
{
  "reason": "CUSTOMER_REQUEST",
  "targetTier": "AI_MANAGER",
  "notes": "Customer specifically asked to speak with a manager"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | enum | Yes | See Escalation Reasons |
| `targetTier` | enum | Yes | `AI_MANAGER` or `HUMAN_AGENT` |
| `notes` | string | No | Additional context |

**Response:** `200 OK`
```json
{
  "success": true,
  "session": {
    "id": "sess_123",
    "currentTier": "AI_MANAGER",
    "status": "ESCALATED",
    "escalationHistory": [
      {
        "fromTier": "AI_REP",
        "toTier": "AI_MANAGER",
        "reason": "CUSTOMER_REQUEST",
        "timestamp": "2025-12-19T12:15:00Z",
        "notes": "Customer specifically asked to speak with a manager"
      }
    ]
  }
}
```

---

## Resolution

### Resolve Session

Marks a session as resolved.

**Endpoint:** `POST /sessions/:id/resolve`

**Request Body:**
```json
{
  "resolutionType": "ISSUE_RESOLVED",
  "summary": "Customer's shipping inquiry resolved - provided tracking update",
  "actionsTaken": [
    "Provided tracking information",
    "Confirmed delivery date"
  ],
  "followUpRequired": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "session": {
    "id": "sess_123",
    "status": "RESOLVED",
    "resolution": {
      "type": "ISSUE_RESOLVED",
      "summary": "Customer's shipping inquiry resolved - provided tracking update",
      "actionsTaken": [
        "Provided tracking information",
        "Confirmed delivery date"
      ],
      "followUpRequired": false
    },
    "resolvedAt": "2025-12-19T12:20:00Z"
  }
}
```

---

## Analytics

### Get Analytics

Retrieves CS analytics for a company.

**Endpoint:** `GET /analytics`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `companyId` | string | Yes | Company UUID |
| `startDate` | string | Yes | Start date (ISO 8601) |
| `endDate` | string | Yes | End date (ISO 8601) |
| `groupBy` | enum | No | `day`, `week`, `month` |

**Response:** `200 OK`
```json
{
  "period": {
    "start": "2025-12-01T00:00:00Z",
    "end": "2025-12-19T23:59:59Z"
  },
  "overview": {
    "totalSessions": 450,
    "resolvedSessions": 412,
    "resolutionRate": 91.5,
    "avgResolutionTime": 420,
    "avgMessagesPerSession": 4.2,
    "customerSatisfactionAvg": 4.3
  },
  "byTier": [
    {
      "tier": "AI_REP",
      "sessions": 350,
      "resolved": 320,
      "resolutionRate": 91.4,
      "avgTime": 300
    },
    {
      "tier": "AI_MANAGER",
      "sessions": 80,
      "resolved": 72,
      "resolutionRate": 90.0,
      "avgTime": 600
    },
    {
      "tier": "HUMAN_AGENT",
      "sessions": 20,
      "resolved": 20,
      "resolutionRate": 100.0,
      "avgTime": 900
    }
  ],
  "byChannel": [
    {
      "channel": "chat",
      "sessions": 300,
      "resolved": 280,
      "avgTime": 350
    },
    {
      "channel": "voice",
      "sessions": 150,
      "resolved": 132,
      "avgTime": 480
    }
  ],
  "escalations": {
    "total": 100,
    "byReason": {
      "IRATE_CUSTOMER": 25,
      "REFUND_REQUEST": 35,
      "COMPLEX_ISSUE": 20,
      "CUSTOMER_REQUEST": 20
    },
    "avgEscalationTime": 180,
    "escalationRate": 22.2
  },
  "sentiment": {
    "distribution": {
      "HAPPY": 120,
      "SATISFIED": 200,
      "NEUTRAL": 80,
      "FRUSTRATED": 40,
      "ANGRY": 10
    },
    "irateIncidents": 5,
    "sentimentImprovement": 35
  }
}
```

---

## Configuration

### Get CS Config

Retrieves the CS configuration for a company.

**Endpoint:** `GET /config`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `companyId` | string | Yes | Company UUID |

**Response:** `200 OK`
```json
{
  "companyId": "uuid",
  "enabled": true,
  "tiers": {
    "aiRep": {
      "enabled": true,
      "capabilities": {
        "canProcessRefunds": false,
        "maxRefundAmount": 0,
        "canModifySubscription": false,
        "canApplyCredits": true,
        "maxCreditAmount": 10
      },
      "responseGuidelines": {
        "tone": "friendly",
        "maxResponseLength": 200
      }
    },
    "aiManager": {
      "enabled": true,
      "capabilities": {
        "canProcessRefunds": true,
        "maxRefundAmount": 100,
        "canModifySubscription": true,
        "canApplyCredits": true,
        "maxCreditAmount": 50
      }
    },
    "humanAgent": {
      "enabled": true,
      "escalationPhone": "+14155559999",
      "notifyOnEscalation": true
    }
  },
  "irateProtocol": {
    "enabled": true,
    "detectionThreshold": 0.7,
    "triggerKeywords": ["angry", "furious", "unacceptable"],
    "autoEscalate": {
      "enabled": true,
      "afterAttempts": 2,
      "targetTier": "AI_MANAGER"
    }
  }
}
```

### Update CS Config

Updates the CS configuration.

**Endpoint:** `PUT /config`

**Request Body:**
```json
{
  "companyId": "uuid",
  "enabled": true,
  "tiers": {
    "aiRep": {
      "capabilities": {
        "maxCreditAmount": 15
      }
    }
  }
}
```

**Response:** `200 OK`

---

## Enums

### Session Status
- `ACTIVE` - Session is ongoing
- `WAITING_CUSTOMER` - Awaiting customer response
- `ESCALATED` - Escalated to higher tier
- `RESOLVED` - Session resolved
- `ABANDONED` - Customer left without resolution

### CS Tier
- `AI_REP` - AI Representative (Tier 1)
- `AI_MANAGER` - AI Manager (Tier 2)
- `HUMAN_AGENT` - Human Agent (Tier 3)

### Issue Category
- `BILLING` - Billing inquiries
- `SHIPPING` - Shipping/delivery issues
- `PRODUCT_QUALITY` - Product quality concerns
- `SUBSCRIPTION` - Subscription management
- `REFUND` - Refund requests
- `TECHNICAL` - Technical support
- `ACCOUNT` - Account management
- `GENERAL_INQUIRY` - General questions
- `COMPLAINT` - Customer complaints
- `CANCELLATION` - Cancellation requests

### Customer Sentiment
- `HAPPY` - Very positive
- `SATISFIED` - Positive
- `NEUTRAL` - No strong emotion
- `FRUSTRATED` - Mildly negative
- `ANGRY` - Negative
- `IRATE` - Extremely negative

### Escalation Reason

**AI Rep → AI Manager:**
- `IRATE_CUSTOMER` - Customer is extremely upset
- `REFUND_REQUEST` - Refund exceeds AI Rep authority
- `COMPLEX_ISSUE` - Issue too complex for Tier 1
- `REPEAT_CONTACT` - Customer contacting multiple times
- `HIGH_VALUE_CUSTOMER` - VIP customer handling
- `LEGAL_MENTION` - Customer mentions legal action
- `SOCIAL_MEDIA_THREAT` - Customer threatens public complaint

**AI Manager → Human:**
- `REFUND_OVER_THRESHOLD` - Refund exceeds all AI authority
- `CUSTOMER_REQUEST` - Customer explicitly requests human
- `POLICY_EXCEPTION` - Requires policy exception
- `ESCALATED_COMPLAINT` - Already escalated complaint
- `TECHNICAL_LIMITATION` - AI cannot handle

### Resolution Type
- `INFORMATION_PROVIDED` - Query answered
- `ISSUE_RESOLVED` - Problem fixed
- `REFUND_PROCESSED` - Refund issued
- `REPLACEMENT_SENT` - Replacement ordered
- `CREDIT_APPLIED` - Credit added to account
- `SUBSCRIPTION_MODIFIED` - Subscription changed
- `ESCALATED_TO_HUMAN` - Transferred to human
- `CUSTOMER_SATISFIED` - Customer expressed satisfaction
- `UNRESOLVED` - Unable to resolve

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `CS_001` | 400 | Invalid session ID |
| `CS_002` | 404 | Session not found |
| `CS_003` | 400 | Session already resolved |
| `CS_004` | 400 | Invalid escalation target |
| `CS_005` | 400 | Missing company ID |
| `CS_006` | 503 | AI service unavailable |
| `CS_007` | 429 | Rate limit exceeded |
| `CS_008` | 400 | Invalid message content |
| `CS_009` | 403 | Company CS not enabled |
| `CS_010` | 500 | AI response generation failed |

**Error Response Format:**
```json
{
  "error": {
    "code": "CS_002",
    "message": "Session not found",
    "details": {
      "sessionId": "sess_123"
    }
  }
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /sessions | 100 | 1 minute |
| POST /sessions/:id/messages | 60 | 1 minute |
| GET /sessions | 200 | 1 minute |
| GET /analytics | 20 | 1 minute |

---

## Webhooks (Outbound)

Configure webhooks to receive real-time updates:

### Session Events

**Event Types:**
- `session.created` - New session started
- `session.escalated` - Session escalated
- `session.resolved` - Session resolved
- `session.abandoned` - Session abandoned

**Webhook Payload:**
```json
{
  "event": "session.escalated",
  "timestamp": "2025-12-19T12:15:00Z",
  "data": {
    "sessionId": "sess_123",
    "companyId": "uuid",
    "customerId": "uuid",
    "fromTier": "AI_REP",
    "toTier": "AI_MANAGER",
    "reason": "IRATE_CUSTOMER"
  }
}
```

---

*Last Updated: December 19, 2025*
