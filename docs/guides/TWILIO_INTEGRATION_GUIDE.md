# Twilio Integration Guide for Voice AI

**Version:** 1.0
**Date:** December 19, 2025

---

## Overview

This guide covers setting up Twilio integration for the Voice AI module, including:
- Twilio account setup
- Phone number configuration
- Webhook configuration
- Credential management via ClientIntegration
- Testing and troubleshooting

---

## Prerequisites

- Twilio account (www.twilio.com)
- Admin access to AVNZ platform
- HTTPS domain for webhooks (required for production)

---

## Step 1: Twilio Account Setup

### Create Twilio Account

1. Go to [www.twilio.com](https://www.twilio.com)
2. Sign up for a new account
3. Complete phone verification
4. Navigate to Console Dashboard

### Get Account Credentials

1. Go to **Account** → **API Keys & Tokens**
2. Note your:
   - **Account SID**: `ACxxxxxxxxxx`
   - **Auth Token**: `xxxxxxxxxx`

> **Security Note:** Never commit these credentials to source control. Store them in ClientIntegration or environment variables.

---

## Step 2: Purchase Phone Number

### Buy a Twilio Number

1. Go to **Phone Numbers** → **Manage** → **Buy a Number**
2. Search for numbers in your desired area code
3. Ensure the number has **Voice** capability
4. Purchase the number

### Number Format

Use E.164 format for all phone numbers:
- US: `+14155551234`
- UK: `+442071234567`

---

## Step 3: Configure Integration in AVNZ

### Via Admin Dashboard

1. Log in to Admin Dashboard
2. Navigate to **Settings** → **Integrations**
3. Click **Add Integration**
4. Select **Twilio** from Communication category
5. Enter credentials:

```
Account SID: ACxxxxxxxxxx
Auth Token: [your auth token]
Phone Number: +14155551234
```

6. Click **Test Connection** to verify
7. Click **Save**

### Via API (Alternative)

```bash
curl -X POST https://api.avnz.io/api/integrations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "your-client-id",
    "provider": "TWILIO",
    "category": "COMMUNICATION",
    "mode": "OWN",
    "credentials": {
      "accountSid": "ACxxxxxxxxxx",
      "authToken": "your-auth-token",
      "phoneNumber": "+14155551234"
    }
  }'
```

---

## Step 4: Configure Webhooks in Twilio

### Navigate to Phone Number Settings

1. Go to **Phone Numbers** → **Manage** → **Active Numbers**
2. Click on your phone number
3. Scroll to **Voice & Fax** section

### Configure Webhook URLs

Set the following URLs:

| Setting | Value |
|---------|-------|
| **A Call Comes In** | `https://api.avnz.io/api/momentum/voice/inbound` |
| HTTP Method | `POST` |
| **Call Status Callback** | `https://api.avnz.io/api/momentum/voice/status-callback` |
| HTTP Method | `POST` |

### Webhook URL Structure

```
Base URL: https://api.avnz.io/api/momentum/voice

Endpoints:
├── /inbound           # Incoming calls
├── /speech            # Speech recognition results
├── /status-callback   # Call status updates
└── /escalate          # Human agent transfer
```

---

## Step 5: Configure CS AI Settings

### Set Up Escalation Phone

For human agent escalation, configure the escalation phone number:

1. Navigate to **Settings** → **Customer Service**
2. Under **Human Agent Configuration**:
   - **Escalation Phone**: Phone number to transfer calls to
   - **Notification Phone**: Phone for SMS alerts (optional)
   - **Enable Notifications**: Toggle on/off

### Via API

```bash
curl -X PUT https://api.avnz.io/api/momentum/cs/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "your-company-id",
    "tiers": {
      "humanAgent": {
        "enabled": true,
        "escalationPhone": "+14155559999",
        "notifyOnEscalation": true,
        "notificationPhone": "+14155558888"
      }
    }
  }'
```

---

## Step 6: Test the Integration

### Test Inbound Call

1. Call your Twilio number from any phone
2. You should hear the AI greeting
3. Speak a test query
4. Verify AI responds appropriately
5. Say "speak to a human" to test escalation

### Test Outbound Call

Via Admin Dashboard:
1. Navigate to **Customers** → Select a customer
2. Click **Actions** → **Start AI Call**
3. Select call type (e.g., "Save Flow")
4. Click **Initiate Call**

Via API:
```bash
curl -X POST https://api.avnz.io/api/momentum/voice/calls/outbound \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "your-company-id",
    "customerId": "customer-id",
    "phoneNumber": "+14155551234"
  }'
```

### Verify Webhook Connectivity

Use Twilio's webhook debugger:
1. Go to **Develop** → **Monitor** → **Logs** → **Webhooks**
2. Make a test call
3. Check for successful 200 responses
4. Review any errors

---

## Multiple Companies Setup

For platforms with multiple companies, each company can have its own Twilio configuration.

### Option 1: Shared Platform Number

- Single Twilio number for all companies
- Company identified by called number or menu selection
- Simpler setup, lower cost

### Option 2: Dedicated Numbers per Company

- Each company has its own Twilio number
- Configure in ClientIntegration for each company
- Numbers route to company-specific handling

### Phone-to-Company Mapping

The system matches incoming calls by phone number:

```typescript
// When a call comes in to +14155551234
// System looks up ClientIntegration with that phoneNumber
// Routes to the associated company
```

---

## Environment Variables (Development)

For local development without ClientIntegration:

```bash
# .env file
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_PHONE_NUMBER=+14155551234
TWILIO_WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
```

> **Note:** In production, always use ClientIntegration for credential storage.

---

## Security Best Practices

### Webhook Signature Validation

The platform automatically validates Twilio webhook signatures:

```typescript
// Handled automatically in voice-ai.controller.ts
const isValid = twilio.validateRequest(
  authToken,
  signature,
  url,
  params
);
```

### Credential Encryption

All credentials stored in ClientIntegration are encrypted:
- AES-256-GCM encryption
- Keys managed via AWS Secrets Manager
- Never exposed in API responses

### IP Whitelisting (Optional)

Optionally whitelist Twilio IPs:
- [Twilio IP Ranges](https://www.twilio.com/docs/sip-trunking/ip-addresses)

---

## Troubleshooting

### Call Not Connecting

**Symptoms:** Outbound calls fail, no call initiated

**Check:**
1. Twilio account has funds/credits
2. Phone number is valid and active
3. Credentials correct in ClientIntegration

```bash
# Test credentials
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/ACxxxxxxxxxx.json" \
  -u "ACxxxxxxxxxx:your-auth-token"
```

### Webhook Not Receiving

**Symptoms:** Calls connect but AI doesn't respond

**Check:**
1. Webhook URL is correct and HTTPS
2. SSL certificate is valid
3. Server is accessible from internet

```bash
# Test webhook endpoint
curl -X POST https://api.avnz.io/api/momentum/voice/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test&From=+14155551234&To=+14155559999"
```

### Speech Not Recognized

**Symptoms:** AI says "I didn't catch that" repeatedly

**Check:**
1. Microphone/audio quality on caller's end
2. speechModel setting (use "phone_call" for better accuracy)
3. Network latency

### Escalation Fails

**Symptoms:** Transfer to human doesn't connect

**Check:**
1. Escalation phone number is valid
2. Number format is E.164
3. Twilio account can make outbound calls to that number

---

## Local Development with ngrok

### Install ngrok

```bash
# macOS
brew install ngrok

# Or download from ngrok.com
```

### Start ngrok Tunnel

```bash
ngrok http 3001
```

### Update Configuration

1. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
2. Update Twilio webhook URLs to use ngrok
3. Set `TWILIO_WEBHOOK_BASE_URL` in .env

### Test Flow

```bash
# Terminal 1: Start API
npm run dev

# Terminal 2: Start ngrok
ngrok http 3001

# Make a test call to your Twilio number
```

---

## Cost Considerations

### Twilio Pricing

| Item | Approximate Cost |
|------|------------------|
| Phone Number | $1-2/month |
| Inbound Call | $0.0085/min |
| Outbound Call | $0.014/min |
| Speech Recognition | $0.02/15 sec |

### Optimization Tips

1. **Shorter AI responses** - Reduce call duration
2. **Efficient speech gathering** - Shorter timeout for yes/no questions
3. **Early call termination** - Detect when customer is done
4. **Caching** - Cache AI responses for common queries

---

## Advanced Configuration

### Custom TTS Voice

Change the AI voice by updating the voice script:

```json
{
  "voice": "Polly.Amy",        // British English
  "voice": "Polly.Joanna",     // US English
  "voice": "Polly.Matthew",    // US English (Male)
  "voice": "Google.en-US-Wavenet-F"  // Google voice
}
```

### Call Recording

Enable call recording for quality assurance:

1. In Twilio Console: **Voice** → **Settings** → **General**
2. Enable "Call Recording"
3. Recordings are stored and accessible via API

### Multiple Language Support

Configure language detection and response:

```json
{
  "languages": ["en-US", "es-ES", "fr-FR"],
  "detectLanguage": true,
  "defaultLanguage": "en-US"
}
```

---

## Support Resources

- **Twilio Documentation:** [www.twilio.com/docs](https://www.twilio.com/docs)
- **Twilio Support:** [support@twilio.com](mailto:support@twilio.com)
- **AVNZ Support:** [support@avnz.io](mailto:support@avnz.io)
- **Status Page:** [status.twilio.com](https://status.twilio.com)

---

*Last Updated: December 19, 2025*
