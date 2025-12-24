# Voice AI API Documentation

**Version:** 1.0
**Date:** December 19, 2025

---

## Overview

The Voice AI module provides intelligent voice-based customer service via Twilio integration. It handles:

- **Outbound Calls:** AI-initiated calls for save flows, reminders, etc.
- **Inbound Calls:** Customer-initiated calls handled by AI
- **Speech Processing:** Real-time speech-to-text and intent detection
- **Human Escalation:** Transfer to human agents when needed

---

## Base URL

```
Production: https://api.avnz.io/api/momentum/voice
Staging: https://staging-api.avnz.io/api/momentum/voice
```

---

## Authentication

### Authenticated Endpoints (Internal Use)

Require JWT Bearer token:
```
Authorization: Bearer <token>
```

### Webhook Endpoints (Twilio)

Validated via Twilio request signature:
- Header: `X-Twilio-Signature`
- Uses AuthToken from ClientIntegration

---

## Outbound Calls

### Initiate Outbound Call

Initiates an AI voice call to a customer.

**Endpoint:** `POST /calls/outbound`

**Authentication:** Bearer token required

**Request Body:**
```json
{
  "companyId": "uuid",
  "customerId": "uuid",
  "phoneNumber": "+14155551234",
  "scriptId": "script_save_flow",
  "context": {
    "orderNumber": "ORD-123",
    "reason": "subscription_cancel_save"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `companyId` | string | Yes | Company UUID |
| `customerId` | string | Yes | Customer UUID |
| `phoneNumber` | string | Yes | E.164 format phone number |
| `scriptId` | string | No | Voice script ID to use |
| `context` | object | No | Context for AI conversation |

**Response:** `201 Created`
```json
{
  "callId": "call_abc123",
  "twilioCallSid": "CA123456789",
  "status": "initiated",
  "direction": "OUTBOUND",
  "from": "+14155559999",
  "to": "+14155551234",
  "createdAt": "2025-12-19T12:00:00Z"
}
```

---

### Get Call Status

Retrieves the status of a voice call.

**Endpoint:** `GET /calls/:callId`

**Authentication:** Bearer token required

**Response:** `200 OK`
```json
{
  "id": "call_abc123",
  "companyId": "uuid",
  "customerId": "uuid",
  "twilioCallSid": "CA123456789",
  "direction": "OUTBOUND",
  "status": "IN_PROGRESS",
  "from": "+14155559999",
  "to": "+14155551234",
  "duration": 120,
  "recordingUrl": null,
  "transcription": [
    {
      "timestamp": "2025-12-19T12:00:05Z",
      "speaker": "ai",
      "text": "Hi, this is the customer service team..."
    },
    {
      "timestamp": "2025-12-19T12:00:15Z",
      "speaker": "customer",
      "text": "Yes, I wanted to cancel my subscription."
    }
  ],
  "sentiment": "NEUTRAL",
  "intent": "CANCEL_SUBSCRIPTION",
  "outcome": null,
  "createdAt": "2025-12-19T12:00:00Z",
  "updatedAt": "2025-12-19T12:02:00Z"
}
```

---

### List Calls

Lists voice calls with filtering.

**Endpoint:** `GET /calls`

**Authentication:** Bearer token required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `companyId` | string | Filter by company (required) |
| `customerId` | string | Filter by customer |
| `direction` | enum | `INBOUND` or `OUTBOUND` |
| `status` | enum | Filter by status |
| `startDate` | string | From date (ISO 8601) |
| `endDate` | string | To date (ISO 8601) |
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |

**Response:** `200 OK`
```json
{
  "calls": [...],
  "total": 250,
  "limit": 50,
  "offset": 0
}
```

---

## Twilio Webhooks

These endpoints are called by Twilio during call flow. They return TwiML responses.

### Inbound Call

Handles incoming calls to the company's Twilio number.

**Endpoint:** `POST /inbound`

**Authentication:** Twilio signature validation

**Request Body (Twilio Form Data):**
| Field | Description |
|-------|-------------|
| `CallSid` | Unique Twilio call identifier |
| `From` | Caller's phone number |
| `To` | Called number (company's Twilio number) |
| `CallStatus` | Call status |
| `Direction` | `inbound` |

**Response:** `200 OK` (TwiML)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">
    Hello! Thank you for calling. How can I help you today?
  </Say>
  <Gather
    input="speech"
    action="/api/momentum/voice/speech"
    speechTimeout="auto"
    speechModel="phone_call">
    <Say>Please tell me what you need help with.</Say>
  </Gather>
</Response>
```

---

### Speech Result

Processes speech recognition results and generates AI response.

**Endpoint:** `POST /speech`

**Authentication:** Twilio signature validation

**Request Body (Twilio Form Data):**
| Field | Description |
|-------|-------------|
| `CallSid` | Twilio call identifier |
| `SpeechResult` | Transcribed speech text |
| `Confidence` | Speech recognition confidence (0-1) |

**Response:** `200 OK` (TwiML)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">
    I understand you're asking about your order status. Let me look that up for you.
    Your order ORD-123 is currently in transit and should arrive by tomorrow.
  </Say>
  <Gather
    input="speech"
    action="/api/momentum/voice/speech"
    speechTimeout="auto">
    <Say>Is there anything else I can help you with?</Say>
  </Gather>
</Response>
```

---

### Status Callback

Receives call status updates from Twilio.

**Endpoint:** `POST /status-callback`

**Authentication:** Twilio signature validation

**Request Body (Twilio Form Data):**
| Field | Description |
|-------|-------------|
| `CallSid` | Twilio call identifier |
| `CallStatus` | `queued`, `ringing`, `in-progress`, `completed`, `busy`, `failed`, `no-answer`, `canceled` |
| `CallDuration` | Call duration in seconds |
| `RecordingUrl` | URL to call recording (if enabled) |

**Response:** `200 OK`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

---

### Escalate to Human

Transfers the call to a human agent.

**Endpoint:** `POST /escalate`

**Authentication:** Twilio signature validation

**Request Body (Twilio Form Data):**
| Field | Description |
|-------|-------------|
| `CallSid` | Twilio call identifier |
| `Digits` | DTMF digits if user pressed a key |

**Response:** `200 OK` (TwiML)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">
    I'm transferring you to a customer service representative.
    Please hold for just a moment.
  </Say>
  <Dial callerId="+14155559999">
    <Number>+14155558888</Number>
  </Dial>
</Response>
```

---

## Voice Scripts

### List Voice Scripts

Retrieves available voice scripts for a company.

**Endpoint:** `GET /scripts`

**Authentication:** Bearer token required

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `companyId` | string | Company UUID (required) |
| `category` | string | Filter by category |
| `active` | boolean | Filter by active status |

**Response:** `200 OK`
```json
{
  "scripts": [
    {
      "id": "script_save_flow",
      "companyId": "uuid",
      "name": "Subscription Save Flow",
      "description": "Used for subscription cancellation saves",
      "category": "RETENTION",
      "isActive": true,
      "stages": [
        {
          "name": "greeting",
          "prompt": "Greet the customer warmly and acknowledge their cancellation request"
        },
        {
          "name": "understand",
          "prompt": "Ask open-ended questions to understand why they want to cancel"
        },
        {
          "name": "offer",
          "prompt": "Based on their reason, present a retention offer"
        },
        {
          "name": "confirm",
          "prompt": "Confirm their decision and next steps"
        }
      ],
      "createdAt": "2025-12-01T00:00:00Z",
      "updatedAt": "2025-12-15T00:00:00Z"
    }
  ],
  "total": 5
}
```

---

### Get Voice Script

Retrieves a specific voice script.

**Endpoint:** `GET /scripts/:scriptId`

**Authentication:** Bearer token required

**Response:** `200 OK`
```json
{
  "id": "script_save_flow",
  "companyId": "uuid",
  "name": "Subscription Save Flow",
  "description": "Used for subscription cancellation saves",
  "category": "RETENTION",
  "isActive": true,
  "stages": [...],
  "variables": [
    {
      "name": "customerName",
      "type": "string",
      "required": true
    },
    {
      "name": "currentPlan",
      "type": "string",
      "required": true
    },
    {
      "name": "offerDiscount",
      "type": "number",
      "required": false,
      "default": 20
    }
  ],
  "aiInstructions": "Be empathetic and understanding. Focus on solving the customer's underlying problem rather than just preventing cancellation.",
  "createdAt": "2025-12-01T00:00:00Z",
  "updatedAt": "2025-12-15T00:00:00Z"
}
```

---

### Create Voice Script

Creates a new voice script.

**Endpoint:** `POST /scripts`

**Authentication:** Bearer token required

**Request Body:**
```json
{
  "companyId": "uuid",
  "name": "Welcome Call",
  "description": "Welcome new customers with onboarding information",
  "category": "ONBOARDING",
  "stages": [
    {
      "name": "greeting",
      "prompt": "Welcome the new customer and thank them for their purchase"
    },
    {
      "name": "overview",
      "prompt": "Provide a brief overview of what they purchased and next steps"
    }
  ],
  "aiInstructions": "Be enthusiastic and helpful. Make the customer feel valued."
}
```

**Response:** `201 Created`

---

## Analytics

### Get Voice Analytics

Retrieves voice AI analytics for a company.

**Endpoint:** `GET /analytics`

**Authentication:** Bearer token required

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `companyId` | string | Yes | Company UUID |
| `startDate` | string | Yes | Start date (ISO 8601) |
| `endDate` | string | Yes | End date (ISO 8601) |

**Response:** `200 OK`
```json
{
  "period": {
    "start": "2025-12-01T00:00:00Z",
    "end": "2025-12-19T23:59:59Z"
  },
  "overview": {
    "totalCalls": 500,
    "outboundCalls": 300,
    "inboundCalls": 200,
    "successRate": 92.5,
    "avgDuration": 180,
    "escalationRate": 15.0
  },
  "byDirection": {
    "outbound": {
      "total": 300,
      "answered": 280,
      "voicemail": 15,
      "noAnswer": 5,
      "avgDuration": 200
    },
    "inbound": {
      "total": 200,
      "handled": 190,
      "abandoned": 10,
      "avgWaitTime": 5,
      "avgDuration": 150
    }
  },
  "byOutcome": {
    "resolved": 400,
    "escalated": 75,
    "callback_scheduled": 15,
    "no_action": 10
  },
  "sentiment": {
    "positive": 350,
    "neutral": 100,
    "negative": 50
  },
  "topIntents": [
    { "intent": "ORDER_STATUS", "count": 120 },
    { "intent": "CANCEL_SUBSCRIPTION", "count": 80 },
    { "intent": "REFUND_REQUEST", "count": 60 }
  ]
}
```

---

## Enums

### Call Status
- `INITIATED` - Call created, not yet dialed
- `RINGING` - Phone is ringing
- `IN_PROGRESS` - Call connected and ongoing
- `COMPLETED` - Call ended normally
- `BUSY` - Line was busy
- `FAILED` - Call could not be completed
- `NO_ANSWER` - No answer after ringing
- `CANCELED` - Call was canceled

### Call Direction
- `INBOUND` - Customer called in
- `OUTBOUND` - AI initiated call

### Call Outcome
- `RESOLVED` - Issue resolved during call
- `ESCALATED` - Transferred to human
- `CALLBACK_SCHEDULED` - Follow-up scheduled
- `VOICEMAIL` - Left voicemail
- `NO_ACTION` - No specific action taken
- `SAVED` - Customer retained (for save flows)
- `CHURNED` - Customer not retained

### Intent Types
- `ORDER_STATUS` - Check order status
- `CANCEL_SUBSCRIPTION` - Cancel subscription
- `REFUND_REQUEST` - Request refund
- `BILLING_INQUIRY` - Billing question
- `TECHNICAL_SUPPORT` - Technical help
- `GENERAL_INQUIRY` - General question
- `COMPLAINT` - Customer complaint
- `SPEAK_TO_HUMAN` - Request human agent

### Sentiment
- `POSITIVE` - Customer is happy
- `NEUTRAL` - No strong emotion
- `NEGATIVE` - Customer is unhappy/frustrated

---

## TwiML Helpers

### Generate Gather TwiML

Helper endpoint to generate TwiML for speech gathering.

**Endpoint:** `POST /twiml/gather`

**Authentication:** Bearer token required

**Request Body:**
```json
{
  "message": "How can I help you today?",
  "voice": "Polly.Amy",
  "timeout": 5,
  "speechModel": "phone_call"
}
```

**Response:** `200 OK`
```json
{
  "twiml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Gather input=\"speech\" action=\"/api/momentum/voice/speech\" speechTimeout=\"auto\" speechModel=\"phone_call\"><Say voice=\"Polly.Amy\">How can I help you today?</Say></Gather></Response>"
}
```

---

### Generate Transfer TwiML

Helper endpoint to generate TwiML for call transfer.

**Endpoint:** `POST /twiml/transfer`

**Authentication:** Bearer token required

**Request Body:**
```json
{
  "targetNumber": "+14155558888",
  "message": "Please hold while I transfer you.",
  "callerId": "+14155559999"
}
```

**Response:** `200 OK`
```json
{
  "twiml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Say voice=\"Polly.Amy\">Please hold while I transfer you.</Say><Dial callerId=\"+14155559999\"><Number>+14155558888</Number></Dial></Response>"
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VOICE_001` | 400 | Invalid phone number format |
| `VOICE_002` | 404 | Call not found |
| `VOICE_003` | 400 | Company not configured for voice |
| `VOICE_004` | 400 | Twilio credentials not configured |
| `VOICE_005` | 503 | Twilio API error |
| `VOICE_006` | 400 | Script not found |
| `VOICE_007` | 400 | Invalid script configuration |
| `VOICE_008` | 429 | Rate limit exceeded |
| `VOICE_009` | 403 | Voice AI not enabled for company |
| `VOICE_010` | 400 | Customer phone number required |

**Error Response Format:**
```json
{
  "error": {
    "code": "VOICE_004",
    "message": "Twilio credentials not configured for this company",
    "details": {
      "companyId": "uuid"
    }
  }
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /calls/outbound | 30 | 1 minute |
| GET /calls | 100 | 1 minute |
| GET /analytics | 20 | 1 minute |
| Webhooks | Unlimited | N/A |

---

## Webhook Security

### Twilio Signature Validation

All webhook endpoints validate the `X-Twilio-Signature` header:

1. Twilio signs each request with your AuthToken
2. The signature is a base64-encoded HMAC-SHA1
3. Requests without valid signatures are rejected with 403

### Configuration

Ensure your webhook URLs are configured correctly in Twilio:

```
Voice URL: https://api.avnz.io/api/momentum/voice/inbound
Status Callback: https://api.avnz.io/api/momentum/voice/status-callback
```

---

## Testing

### Local Development with ngrok

For local testing, use ngrok to expose your local server:

```bash
# Start ngrok
ngrok http 3001

# Update Twilio webhook URL to ngrok URL
# https://abc123.ngrok.io/api/momentum/voice/inbound
```

### Test Call Flow

```bash
# 1. Initiate test outbound call
curl -X POST http://localhost:3001/api/momentum/voice/calls/outbound \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid",
    "customerId": "uuid",
    "phoneNumber": "+14155551234"
  }'

# 2. Simulate inbound call (webhook)
curl -X POST http://localhost:3001/api/momentum/voice/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CA123&From=+14155551234&To=+14155559999&CallStatus=ringing"

# 3. Simulate speech result
curl -X POST http://localhost:3001/api/momentum/voice/speech \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CA123&SpeechResult=Where is my order&Confidence=0.95"
```

---

*Last Updated: December 19, 2025*
