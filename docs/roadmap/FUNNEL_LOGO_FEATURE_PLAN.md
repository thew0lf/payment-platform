# Funnel Logo Feature - Design & Implementation Plan

## Executive Summary
Add tiered logo capabilities to funnels: upload for all users, AI generation for higher tiers.

---

## Product Manager Review

### User Problem
- Funnels currently show plain text company name in header
- Professional funnels need branded logos for credibility and conversion
- Users want easy logo creation without hiring designers

### User Stories
1. **Free Tier User**: "I want to upload my company logo so my funnel looks professional"
2. **Pro Tier User**: "I want to resize/optimize my logo for different placements"
3. **Enterprise User**: "I want AI to generate logo options based on my brand/industry"

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Logo adoption rate | 60% of funnels | % of funnels with logo set |
| AI generation usage | 40% of Enterprise users | API calls per Enterprise company |
| Conversion improvement | +5% | A/B test funnels with/without logo |

### Tier Breakdown

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Upload logo (PNG/JPG/SVG) | ✅ | ✅ | ✅ |
| Auto-resize for header | ✅ | ✅ | ✅ |
| Multiple format export | ❌ | ✅ | ✅ |
| Background removal | ❌ | ✅ | ✅ |
| AI logo generation | ❌ | ❌ | ✅ |
| Logo variations (AI) | ❌ | ❌ | ✅ |
| Brand kit integration | ❌ | ❌ | ✅ |

### Questions for Stakeholders
1. Should we offer logo templates for Free tier users?
2. How many AI generations per month for Enterprise?
3. Do we need favicon generation too?

---

## Senior Developer Review

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │           Logo Management Component                      ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  ││
│  │  │  Upload  │  │  Preview │  │  AI Generate (Ent)   │  ││
│  │  └──────────┘  └──────────┘  └──────────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              FunnelLogoService                           ││
│  │  - uploadLogo(companyId, file)                          ││
│  │  - getLogoCapabilities(companyId)                       ││
│  │  - generateLogo(companyId, prompt) [Enterprise]         ││
│  │  - processLogo(logoUrl, options) [Pro+]                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────────┐    ┌──────────────┐
    │   S3     │       │  Cloudinary  │    │ AWS Bedrock  │
    │ Storage  │       │  Processing  │    │ (Titan/SD)   │
    └──────────┘       └──────────────┘    └──────────────┘
```

### Existing Infrastructure to Leverage
- `S3StorageService` - Already handles file uploads
- `CloudinaryService` - Already handles image processing
- `BedrockService` - Already configured for AI (add image generation)
- `FunnelImageService` - Pattern for tier-based capabilities
- `ClientIntegrationService` - Check what integrations company has

### New Components Needed

| Component | Type | Purpose |
|-----------|------|---------|
| `FunnelLogoService` | Backend Service | Core logo operations |
| `FunnelLogoController` | Backend Controller | API endpoints |
| `LogoUpload` | Frontend Component | Drag-drop upload |
| `LogoGenerator` | Frontend Component | AI generation UI |
| `LogoPreview` | Frontend Component | Preview in header |

### API Endpoints

```typescript
// Logo Management
POST   /api/funnels/:id/logo           // Upload logo
DELETE /api/funnels/:id/logo           // Remove logo
GET    /api/funnels/logo/capabilities  // Check tier capabilities

// AI Generation (Enterprise only)
POST   /api/funnels/logo/generate      // Generate logo options
GET    /api/funnels/logo/generate/:jobId  // Check generation status
```

### Database Changes
**None required** - Logo URL already exists in `FunnelSettings.branding.logoUrl`

### Security Considerations
1. **File validation**: Only allow PNG, JPG, SVG, WebP
2. **Size limits**: Max 5MB for uploads
3. **SSRF protection**: Validate URLs (reuse existing patterns)
4. **Rate limiting**: Max 10 AI generations/day for Enterprise
5. **Content moderation**: Filter inappropriate AI-generated content

### Performance Considerations
1. **Logo optimization**: Auto-resize to max 400px width on upload
2. **CDN delivery**: Serve logos through CloudFront
3. **Lazy loading**: Don't block funnel load for logo
4. **Caching**: Cache logo URLs in funnel response

---

## Implementation Phases

### Phase 1: Logo Upload (All Tiers) - Foundation
**Scope**: Enable basic logo upload and display

**Backend Tasks**:
- [ ] Create `FunnelLogoService` with upload capability
- [ ] Create `FunnelLogoController` with upload endpoint
- [ ] Add logo validation (file type, size)
- [ ] Integrate with `S3StorageService`
- [ ] Update funnel settings on upload

**Frontend Tasks**:
- [ ] Create `LogoUpload` component with drag-drop
- [ ] Add logo section to funnel builder/settings
- [ ] Show logo preview in funnel header
- [ ] Add remove logo functionality

**Tests**:
- [ ] Unit tests for FunnelLogoService
- [ ] E2E test for upload flow

**Deliverables**:
- Users can upload PNG/JPG/SVG logos
- Logos display in funnel header
- Logos stored in S3 with CDN delivery

---

### Phase 2: Logo Processing (Pro Tier)
**Scope**: Add image processing capabilities for Pro users

**Backend Tasks**:
- [ ] Add `processLogo()` method using Cloudinary
- [ ] Implement background removal
- [ ] Implement auto-resize/optimization
- [ ] Add format conversion (PNG, WebP, SVG)

**Frontend Tasks**:
- [ ] Add processing options to LogoUpload
- [ ] Show "Pro feature" badges for processing
- [ ] Add background removal toggle
- [ ] Add size/format options

**Tests**:
- [ ] Unit tests for processing methods
- [ ] Integration test with Cloudinary

**Deliverables**:
- Pro users can remove logo backgrounds
- Auto-optimization on upload
- Multiple format support

---

### Phase 3: AI Logo Generation (Enterprise Tier)
**Scope**: Enable AI-powered logo creation

**Backend Tasks**:
- [ ] Add logo generation to `BedrockService`
- [ ] Create job queue for async generation
- [ ] Implement prompt engineering for logos
- [ ] Add content moderation filter
- [ ] Rate limiting (10/day)

**Frontend Tasks**:
- [ ] Create `LogoGenerator` component
- [ ] Add industry/style selection
- [ ] Show generation progress
- [ ] Display multiple options for selection
- [ ] Add "regenerate" functionality

**Tests**:
- [ ] Unit tests for generation service
- [ ] Mock tests for Bedrock integration

**Deliverables**:
- Enterprise users can describe desired logo
- AI generates 4 logo options
- User selects and applies to funnel

---

### Phase 4: Polish & Brand Kit
**Scope**: Advanced features and brand consistency

**Backend Tasks**:
- [ ] Brand kit storage (colors, fonts, logo variants)
- [ ] Auto-generate favicon from logo
- [ ] Logo history/versioning

**Frontend Tasks**:
- [ ] Brand kit management UI
- [ ] Logo variant selector (dark/light mode)
- [ ] Favicon preview

**Deliverables**:
- Brand kit for consistent styling
- Auto-favicon generation
- Logo variants for different contexts

---

## Technical Specifications

### Logo Upload Validation
```typescript
const LOGO_CONSTRAINTS = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
  maxDimensions: { width: 2000, height: 2000 },
  outputSize: { width: 400, height: 100 }, // For header
};
```

### AI Generation Prompt Template
```
Generate a professional, minimal logo for a [INDUSTRY] company.
Style: [STYLE - modern/classic/playful/elegant]
Colors: [PRIMARY_COLOR] and [SECONDARY_COLOR]
Include: [OPTIONAL - icon, text, abstract shape]
The logo should work well on both light and dark backgrounds.
Output as clean vector-style design.
```

### Tier Detection Logic
```typescript
async getLogoCapabilities(companyId: string): Promise<LogoCapabilities> {
  const subscription = await this.getCompanySubscription(companyId);
  const hasCloudinary = await this.hasIntegration(companyId, 'CLOUDINARY');
  const hasBedrock = await this.hasIntegration(companyId, 'AWS_BEDROCK');

  return {
    canUpload: true, // All tiers
    canProcess: subscription.tier >= 'PRO' && hasCloudinary,
    canGenerate: subscription.tier === 'ENTERPRISE' && hasBedrock,
    generationsRemaining: await this.getGenerationsRemaining(companyId),
  };
}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI generates inappropriate content | Medium | High | Content moderation + human review option |
| High S3 storage costs | Low | Medium | Optimize images, set retention policy |
| Slow AI generation | Medium | Medium | Async with progress, cache results |
| Users expect design-quality logos | High | Medium | Set expectations, offer templates |

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Upload | 3-4 days | S3 integration (exists) |
| Phase 2: Processing | 2-3 days | Cloudinary integration (exists) |
| Phase 3: AI Generation | 4-5 days | Bedrock integration (exists) |
| Phase 4: Brand Kit | 3-4 days | Phase 1-3 complete |

**Total: ~2-3 weeks**

---

## Open Questions

1. **PM Decision**: Should Free tier get 1-2 basic templates to choose from?
2. **PM Decision**: How many AI generations per month for Enterprise? (Proposal: 50)
3. **Tech Decision**: Use Stable Diffusion or DALL-E via Bedrock?
4. **UX Decision**: Where in funnel builder should logo management live?

---

## Sign-Off Required

| Role | Name | Approval | Date |
|------|------|----------|------|
| Product Manager | | [ ] | |
| Senior Developer | | [ ] | |
| UX Designer | | [ ] | |

---

*Created: December 30, 2025*
