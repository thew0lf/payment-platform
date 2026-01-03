# Visual Content Integration - Deployment Plan

## Overview
Deployment plan for the AI-powered visual content system across three tiers:
- **Free Tier**: Stock images from Unsplash/Pexels
- **Pro Tier**: Custom uploads + Cloudinary processing
- **Enterprise Tier**: Runway AI video generation

---

## DevOps Review & Deployment Checklist

### Infrastructure Requirements

| Component | Service | Environment Variables | Purpose |
|-----------|---------|----------------------|---------|
| Stock Images | Unsplash API | `UNSPLASH_ACCESS_KEY` | Free stock photos |
| Stock Images | Pexels API | `PEXELS_API_KEY` | Free stock photos |
| Image Storage | AWS S3 | Via ClientIntegration | Image/video storage |
| CDN | CloudFront | Via S3 integration | Fast delivery |
| Image Processing | Cloudinary | Via ClientIntegration | BG removal, crop, enhance |
| Video Generation | Runway ML | Via ClientIntegration | AI video generation |

### Deployment Steps

#### Phase 1: Stock Image Service (Free Tier)
```bash
# 1. Verify environment variables are set
echo $UNSPLASH_ACCESS_KEY  # Should not be empty
echo $PEXELS_API_KEY       # Should not be empty

# 2. Deploy API changes
docker-compose -p avnz-payment-platform build api --no-cache
docker-compose -p avnz-payment-platform up -d api

# 3. Verify deployment
curl -s http://localhost:3001/api/health | jq
```

**Rollback Plan:**
```bash
git revert HEAD  # Revert commit if issues
docker-compose -p avnz-payment-platform build api
docker-compose -p avnz-payment-platform up -d api
```

#### Phase 2: Cloudinary Integration (Pro Tier)
- No infrastructure changes - uses existing S3 + Cloudinary fetch mode
- Cloudinary configured via ClientIntegration (UI-based)

#### Phase 3: Runway Video Generation (Enterprise Tier)
```bash
# Current: In-memory job store (MVP)
# Production: Requires Redis/BullMQ for distributed job queue

# 1. Add Redis for job queue (future)
# docker-compose.yml addition:
# redis-jobs:
#   image: redis:7-alpine
#   ports:
#     - "6380:6379"
#   volumes:
#     - redis_jobs:/data
```

### Monitoring Setup

#### CloudWatch Alarms (Recommended)
```json
{
  "StockImageAPIErrors": {
    "MetricName": "stock_image_api_errors",
    "Threshold": 10,
    "Period": 300,
    "EvaluationPeriods": 2
  },
  "VideoGenerationTimeout": {
    "MetricName": "video_generation_timeout",
    "Threshold": 5,
    "Period": 900,
    "EvaluationPeriods": 1
  },
  "S3UploadErrors": {
    "MetricName": "s3_upload_errors",
    "Threshold": 5,
    "Period": 300,
    "EvaluationPeriods": 2
  }
}
```

#### Datadog Dashboards
- Stock image API latency
- Video generation queue depth
- S3 upload success rate
- Cloudinary processing time

---

## DBA Review & Database Considerations

### Current Schema Impact
**No database migrations required** - This feature uses:
- In-memory job storage (MVP)
- Existing `ClientIntegration` table for credentials
- Existing `Funnel` and `FunnelStage` tables for content

### Future Database Requirements (Production)

#### Video Job Persistence
```prisma
// Future: Add to schema.prisma
model VideoJob {
  id            String   @id @default(cuid())
  companyId     String
  status        VideoJobStatus @default(QUEUED)
  runwayTaskId  String?
  progress      Int      @default(0)
  request       Json     // GenerateHeroVideoRequest
  result        Json?    // GeneratedVideoResult
  error         String?
  retryCount    Int      @default(0)
  maxRetries    Int      @default(3)
  createdAt     DateTime @default(now())
  startedAt     DateTime?
  completedAt   DateTime?

  company       Company  @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([status, createdAt])
  @@index([runwayTaskId])
  @@map("video_jobs")
}

enum VideoJobStatus {
  PENDING
  QUEUED
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELLED
}
```

#### Migration Plan
1. Create migration: `npx prisma migrate dev --name add_video_jobs`
2. Add indexes for common queries
3. Update `VideoJob` model status from PENDING to QUEUED
4. Backfill any in-flight jobs (N/A for fresh deploy)

### Data Retention Policy
- Video jobs: Keep for 90 days
- Generated videos: Keep until funnel deleted + 30 days grace
- Audit logs: Keep for 7 years (compliance)

### Backup Considerations
- Video assets stored in S3 with versioning enabled
- Job metadata in PostgreSQL (standard backup)
- No PII in video job records

---

## Developer Review & Code Quality

### Files Modified/Added

| File | Change Type | Lines | Test Coverage |
|------|-------------|-------|---------------|
| `funnels/services/funnel-image.service.ts` | Modified | ~400 | 37 tests |
| `funnels/services/funnel-video.service.ts` | New | ~650 | 23 tests |
| `integrations/services/providers/stock-image.service.ts` | Modified | ~200 | 17 tests |
| `funnels/funnels.module.ts` | Modified | 3 | N/A |

**Total Test Coverage: 77 tests**

### Security Validations Implemented

| Security Control | Implementation | File:Line |
|-----------------|----------------|-----------|
| SSRF Protection | Domain whitelist | funnel-video.service.ts:130-147 |
| Company ID Validation | CUID regex | funnel-video.service.ts:585-593 |
| HTTPS Enforcement | Protocol check | funnel-video.service.ts:605-608 |
| Credential Type Guards | Runtime validation | funnel-video.service.ts:638-655 |
| Company Access Control | Job ownership check | funnel-video.service.ts:291-293 |

### Error Messages (AVNZ Brand Voice)
All error messages follow the AVNZ brand voice guidelines:
- Friendly, not technical
- Actionable guidance
- No blame on user

### API Endpoints Added

```typescript
// FunnelVideoService (internal service - no controller yet)
// Methods exposed via FunnelImageService.resolveHeroContent()

// Future: Add video generation controller
// POST /api/funnels/:id/video-jobs
// GET  /api/funnels/:id/video-jobs/:jobId
// DELETE /api/funnels/:id/video-jobs/:jobId (cancel)
```

### Known Limitations (MVP)

1. **In-Memory Job Store**: Jobs lost on server restart
   - Mitigation: Add Redis/BullMQ in production

2. **No Retry Mechanism**: Failed jobs stay failed
   - Mitigation: Add retry with exponential backoff

3. **Single Instance Only**: No horizontal scaling support
   - Mitigation: Use Redis for job coordination

### Performance Considerations

- Stock image search: ~200-500ms (cached by providers)
- Cloudinary processing: ~1-3s (on-demand)
- Video generation: ~30-180s (async with polling)
- S3 upload: ~1-5s depending on size

---

## Deployment Sequence

### Pre-Deployment Checklist
- [ ] Verify all 77 tests pass
- [ ] TypeScript compiles with no errors
- [ ] Environment variables configured
- [ ] CloudFront distribution configured (if using CDN)
- [ ] Cloudinary account has sufficient credits
- [ ] Runway API key has sufficient credits

### Deployment Order
1. Deploy database migrations (if any)
2. Deploy API with new services
3. Verify health check endpoints
4. Test stock image resolution
5. Test Cloudinary processing (Pro tier company)
6. Test video generation (Enterprise tier company)

### Post-Deployment Verification
```bash
# 1. Check API health
curl http://localhost:3001/api/health

# 2. Test stock image search (requires auth token)
TOKEN="your-auth-token"
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/funnels/test-funnel/hero-image?query=coffee"

# 3. Check video capabilities
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/funnels/video-capabilities?companyId=test-company"
```

---

## Rollback Procedures

### Immediate Rollback (< 5 min)
```bash
# Revert to previous Docker image
docker-compose -p avnz-payment-platform pull api
docker-compose -p avnz-payment-platform up -d api
```

### Full Rollback (with migrations)
```bash
# 1. Revert code
git revert HEAD

# 2. If migrations applied, rollback
npx prisma migrate resolve --rolled-back add_video_jobs

# 3. Rebuild and deploy
docker-compose -p avnz-payment-platform build api
docker-compose -p avnz-payment-platform up -d api
```

---

## Sign-Off

| Role | Name | Date | Approval |
|------|------|------|----------|
| DevOps | | | [ ] |
| DBA | | | [ ] |
| Developer | | | [ ] |
| QA | | | [ ] |
| Product | | | [ ] |

---

## Appendix: Environment Variables Reference

```bash
# Stock Images (Required for Free Tier)
UNSPLASH_ACCESS_KEY=your_unsplash_key
PEXELS_API_KEY=your_pexels_key

# Note: Cloudinary and Runway credentials are stored in
# ClientIntegration records, encrypted with INTEGRATION_ENCRYPTION_KEY

# Encryption (Required)
INTEGRATION_ENCRYPTION_KEY=64_char_hex_key

# AWS (for S3 storage - also can be in ClientIntegration)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
```

---

*Last Updated: December 30, 2025*
*Feature: Visual Content Integration (Phases 1-3)*
