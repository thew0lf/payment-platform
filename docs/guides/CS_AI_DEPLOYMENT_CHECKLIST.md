# CS AI Deployment Checklist

**Version:** 1.0
**Date:** December 19, 2025
**Status:** Ready for Deployment

---

## Pre-Deployment Checklist

### 1. Environment Variables

#### Required Variables

| Variable | Description | Example | Where to Set |
|----------|-------------|---------|--------------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | `sk-ant-api03-...` | AWS Secrets Manager |
| `TWILIO_WEBHOOK_BASE_URL` | Base URL for Twilio webhooks | `https://api.avnz.io` | Environment config |

#### Optional Fallback Variables

These are used only if ClientIntegration is not configured:

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `xxxxxxxxxx` |
| `TWILIO_PHONE_NUMBER` | Twilio Phone Number | `+14155551234` |

### 2. ClientIntegration Setup

For each company using CS AI, ensure the following integrations are configured:

#### Twilio Integration
```json
{
  "provider": "TWILIO",
  "category": "COMMUNICATION",
  "credentials": {
    "accountSid": "ACxxxxxxxxxx",
    "authToken": "encrypted-value",
    "phoneNumber": "+14155551234"
  },
  "status": "ACTIVE"
}
```

Configure via Admin Dashboard: `/integrations` → Add Twilio Integration

#### Anthropic Integration (for CS AI)
```json
{
  "provider": "ANTHROPIC",
  "category": "AI_ML",
  "credentials": {
    "apiKey": "sk-ant-api03-..."
  },
  "status": "ACTIVE"
}
```

### 3. CSConfig Setup

Each company needs a CSConfig record with AI tier configurations:

```json
{
  "companyId": "company-uuid",
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
      "notifyOnEscalation": true,
      "notificationPhone": "+14155558888"
    }
  }
}
```

---

## Twilio Webhook Configuration

### Production Webhook URLs

Configure these URLs in your Twilio Console:

| Webhook Type | URL | HTTP Method |
|--------------|-----|-------------|
| Voice URL (Incoming) | `https://api.avnz.io/api/momentum/voice/inbound` | POST |
| Status Callback | `https://api.avnz.io/api/momentum/voice/status-callback` | POST |
| Speech Result | `https://api.avnz.io/api/momentum/voice/speech` | POST |
| Escalation | `https://api.avnz.io/api/momentum/voice/escalate` | POST |

### Webhook Security

1. **Twilio Request Validation** - Enabled by default
   - The service validates `X-Twilio-Signature` header
   - Uses AuthToken from ClientIntegration

2. **HTTPS Required** - All webhooks must use HTTPS in production

3. **IP Whitelisting** (Optional) - Twilio IP ranges can be whitelisted

### Testing Webhooks

```bash
# Test inbound call webhook (local development)
curl -X POST http://localhost:3001/api/momentum/voice/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CA123&From=+14155551234&To=+14155559999&CallStatus=ringing"
```

---

## Database Migrations

### Required Tables

Verify these tables exist and have proper indexes:

| Table | Status | Notes |
|-------|--------|-------|
| `CSSession` | ✅ Created | Stores customer service sessions |
| `CSMessage` | ✅ Created | Stores conversation messages |
| `CSConfig` | ✅ Created | Company-level CS configuration |
| `CSAIUsage` | ✅ Created | AI token usage tracking |
| `CSAIPricing` | ✅ Created | Pricing configuration |
| `CSAIUsageSummary` | ✅ Created | Usage aggregation |
| `VoiceCall` | ✅ Created | Voice call records |
| `VoiceScript` | ✅ Created | Call scripts |

### Run Migration Check

```bash
# Verify all migrations applied
npx prisma migrate status

# Apply any pending migrations
npx prisma migrate deploy
```

### Index Review

Key indexes for performance:

```sql
-- CSSession indexes
CREATE INDEX idx_cssession_companyid_status ON "CSSession"("companyId", "status");
CREATE INDEX idx_cssession_customerid ON "CSSession"("customerId");

-- VoiceCall indexes
CREATE INDEX idx_voicecall_companyid_status ON "VoiceCall"("companyId", "status");
CREATE INDEX idx_voicecall_twiliosid ON "VoiceCall"("twilioCallSid");

-- CSAIUsage indexes
CREATE INDEX idx_csaiusage_companyid_createdat ON "CSAIUsage"("companyId", "createdAt");
```

---

## Monitoring Setup

### Datadog Integration

Add these metrics to Datadog dashboards:

#### Voice AI Metrics
- `voice_ai.calls.total` - Total calls initiated
- `voice_ai.calls.success_rate` - Successful call percentage
- `voice_ai.calls.duration_avg` - Average call duration
- `voice_ai.calls.escalation_rate` - Escalation to human percentage

#### Customer Service Metrics
- `cs_ai.sessions.total` - Total sessions started
- `cs_ai.sessions.resolution_rate` - AI resolution percentage
- `cs_ai.messages.avg_per_session` - Average messages per session
- `cs_ai.tokens.daily_usage` - Claude token consumption

### Alerts Configuration

| Alert | Threshold | Severity |
|-------|-----------|----------|
| Call Success Rate | < 90% for 5 min | Critical |
| Webhook Response Time | > 5s for 3 min | Warning |
| AI Token Usage | > $100/hour | Warning |
| Escalation Rate | > 40% for 15 min | Warning |
| Error Rate | > 5% for 5 min | Critical |

### Health Check Endpoints

```bash
# API Health Check
GET /api/health

# CS AI specific health
GET /api/momentum/cs/health
```

---

## Deployment Steps

### 1. Pre-Deploy Verification

```bash
# Run all tests
npm test -- --testPathPattern="momentum-intelligence"

# Type check
npx tsc --noEmit

# Lint check
npm run lint

# Build
npm run build
```

### 2. Staging Deployment

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Run smoke tests
npm run test:e2e:staging

# Verify webhooks
curl -X POST https://staging-api.avnz.io/api/momentum/voice/health
```

### 3. Production Deployment

```bash
# Deploy to production (blue-green)
./scripts/deploy.sh production

# Verify health check
curl https://api.avnz.io/api/health

# Monitor for 15 minutes before full rollout
```

### 4. Post-Deploy Verification

- [ ] Health check passes
- [ ] Test inbound call webhook responds
- [ ] Test outbound call initiates
- [ ] CS session can be started
- [ ] Analytics endpoints return data
- [ ] No errors in logs

---

## Rollback Plan

### Automatic Rollback Triggers

1. Error rate > 10% for 5 minutes
2. Health check fails 3 consecutive times
3. P99 latency > 10 seconds for 5 minutes

### Manual Rollback Steps

```bash
# Quick rollback
./scripts/rollback.sh production

# Or using ECS
aws ecs update-service --cluster production --service api --task-definition api:previous-version
```

### Rollback Verification

1. Confirm previous version deployed
2. Verify health checks pass
3. Test critical endpoints
4. Review error logs

---

## Seed Data

### Production vs Staging

| Data Type | Production | Staging |
|-----------|------------|---------|
| CSConfig | Created on first use | Seeded |
| Demo Sessions | ❌ Never | ✅ Seeded |
| Demo VoiceCalls | ❌ Never | ✅ Seeded |
| Usage Data | Real only | ✅ Seeded |

### Production Seed (Safe)

Only seeds essential configuration, no demo data:

```bash
# Safe for production - only creates missing configs
npx prisma db seed --preview-feature
```

### Staging Full Seed

Includes demo data for testing:

```bash
# Staging only - includes demo sessions/calls
NODE_ENV=staging npx prisma db seed
```

---

## Support Runbook

### Common Issues

#### 1. Webhook Not Receiving Calls

**Symptoms:** Inbound calls not logged, TwiML not returned

**Check:**
1. Twilio webhook URL configuration
2. SSL certificate valid
3. Firewall allows Twilio IPs
4. Logs for webhook errors

**Fix:**
```bash
# Test webhook locally
ngrok http 3001
# Update Twilio with ngrok URL for testing
```

#### 2. AI Response Timeout

**Symptoms:** Calls hang, "I didn't catch that" repeated

**Check:**
1. Anthropic API key valid
2. Claude API rate limits
3. Network latency to Anthropic

**Fix:**
- Verify API key in ClientIntegration
- Check Anthropic dashboard for rate limiting
- Increase timeout in voice-ai.service.ts

#### 3. Escalation Fails

**Symptoms:** Human transfer doesn't connect

**Check:**
1. Escalation phone number in CSConfig
2. Phone number format (+E.164)
3. Twilio account has calling enabled

**Fix:**
- Verify escalationPhone in CSConfig
- Test phone number directly via Twilio console

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| DevOps Lead | TBD | devops@avnz.io |
| Backend Lead | TBD | engineering@avnz.io |
| On-Call | TBD | oncall@avnz.io |
| Twilio Support | N/A | support@twilio.com |
| Anthropic Support | N/A | support@anthropic.com |

---

## Approval Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] ClientIntegration credentials set
- [ ] Twilio webhooks configured
- [ ] Monitoring dashboards created
- [ ] Alerts configured
- [ ] Rollback plan tested
- [ ] On-call scheduled

**Approved By:** _________________ **Date:** _________________

---

*Last Updated: December 19, 2025*
