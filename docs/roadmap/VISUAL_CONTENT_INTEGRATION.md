# Visual Content Integration for Funnels

## Overview

This document outlines the strategy for integrating visual content generation into AI-generated landing pages using our existing integration framework.

## Problem Statement

AI-generated funnels currently produce `suggestedImageKeywords` but no actual images are rendered. This creates:
- Text-only landing pages with poor conversion rates (0.5-1%)
- Missing emotional connection with visitors
- No product visualization
- Missed opportunity to differentiate Pro/Enterprise tiers

## Available Integrations

### 1. Cloudinary (IMAGE_PROCESSING)

**Service:** `apps/api/src/integrations/services/providers/cloudinary.service.ts`

| Method | Purpose | Use Case |
|--------|---------|----------|
| `removeBackground()` | Remove image backgrounds | Clean product shots |
| `smartCrop()` | AI-aware cropping | Responsive hero images |
| `enhance()` | Auto color/contrast | Improve uploaded photos |
| `upscale()` | AI upscaling | HD product images |

**Architecture:** Uses "fetch" mode to process remote S3 images without upload.

```typescript
// Example: Process hero image
const result = await cloudinaryService.smartCrop(credentials, s3ImageUrl, {
  aspectRatio: '16:9',
  gravity: 'auto:subject'
});
```

### 2. Runway (VIDEO_GENERATION)

**Service:** `apps/api/src/integrations/services/providers/runway.service.ts`

| Method | Purpose | Use Case |
|--------|---------|----------|
| `generateVideo()` | Image-to-video | Product showcases |
| `waitForCompletion()` | Poll for result | Async video generation |
| `generateAndDownload()` | Full pipeline | Auto video creation |

**Models:** gen3a_turbo, gen3a, gen4, gen4_turbo
**Duration:** 5 or 10 seconds
**Resolution:** 720p, 1080p, 4K
**Aspect Ratios:** 16:9, 9:16 (vertical), 1:1 (square)

```typescript
// Example: Generate product video
const video = await runwayService.generateAndDownload(credentials, settings, {
  imageUrl: productImageUrl,
  prompt: 'Subtle product motion, professional showcase',
  duration: 5,
  aspectRatio: '16:9'
});
```

### 3. OpenAI (AI_ML)

**Service:** `apps/api/src/integrations/services/providers/openai.service.ts`

| Method | Purpose | Use Case |
|--------|---------|----------|
| `generateAltText()` | Accessibility text | SEO + a11y |
| `generateProductDescription()` | Enhanced copy | Product cards |
| `suggestCategorization()` | Auto-categorize | Image tagging |

**Note:** Does not currently include DALL-E image generation.

---

## Tier-Based Visual Content Strategy

### Free Tier

**Features:**
- Stock image fallback via Unsplash/Pexels API
- Match `suggestedImageKeywords` to stock images
- Static placeholder images
- No AI enhancement

**Implementation:**
```typescript
// Free tier: Fetch stock image based on keywords
const stockImage = await unsplashApi.search({
  query: suggestedImageKeywords.join(' '),
  orientation: 'landscape'
});
```

### Pro Tier ($49/mo)

**Features:**
- All Free tier features
- Cloudinary integration for uploaded images
- AI background removal
- Smart cropping for responsive layouts
- Image enhancement (color/contrast)
- AI-generated alt text

**Value Proposition:**
- Professional-looking product shots
- Optimized images for fast loading
- Better accessibility/SEO

**Implementation:**
```typescript
// Pro tier: Enhanced image processing
if (company.hasIntegration(IntegrationProvider.CLOUDINARY)) {
  const enhanced = await cloudinaryService.enhance(credentials, uploadedImageUrl);
  const cropped = await cloudinaryService.smartCrop(credentials, enhanced.processedUrl, {
    aspectRatio: '16:9'
  });
}
```

### Enterprise Tier ($199/mo)

**Features:**
- All Pro tier features
- Runway video generation
- AI product showcase videos
- Animated hero backgrounds
- Social media video clips
- Premium visual effects

**Value Proposition:**
- Video content converts 4-6x better
- Shareable social media assets
- Premium brand experience

**Implementation:**
```typescript
// Enterprise tier: Video generation
if (company.hasIntegration(IntegrationProvider.RUNWAY)) {
  const video = await runwayService.generateAndDownload(credentials, settings, {
    imageUrl: productHeroUrl,
    prompt: `Professional ${productCategory} showcase with subtle motion`,
    duration: 5,
    aspectRatio: '16:9'
  });
  // Upload to S3 and set as hero video
}
```

---

## Implementation Plan

### Phase 1: Stock Image Fallback (Week 1)

**Goal:** Every landing page has images by default

1. Add Unsplash API integration
2. Create `ImageProviderService` to fetch stock images
3. Map AI `suggestedImageKeywords` to image queries
4. Update landing page renderer to display images

**Files to Create/Modify:**
- `apps/api/src/integrations/services/providers/unsplash.service.ts` (new)
- `apps/api/src/funnels/services/funnel-image.service.ts` (new)
- `apps/admin-dashboard/src/app/f/[seoSlug]/page.tsx` (update hero)

### Phase 2: Cloudinary Integration (Week 2)

**Goal:** Pro clients can upload and enhance images

1. Add image upload to funnel builder
2. Connect Cloudinary processing pipeline
3. Auto-generate responsive variants
4. Add alt text generation via OpenAI

**Files to Create/Modify:**
- `apps/api/src/funnels/services/funnel-media.service.ts` (new)
- `apps/admin-dashboard/src/components/funnels/media-uploader.tsx` (new)

### Phase 3: Runway Video Integration (Week 3-4)

**Goal:** Enterprise clients get auto-generated videos

1. Add video generation queue (async processing)
2. Create video preview component
3. Implement video hero section
4. Add social media clip export

**Files to Create/Modify:**
- `apps/api/src/funnels/services/funnel-video.service.ts` (new)
- `apps/api/src/funnels/queues/video-generation.queue.ts` (new)
- `apps/admin-dashboard/src/components/funnels/video-hero.tsx` (new)

---

## AI Funnel Generator Updates

### Current Output (HeroSection)
```typescript
interface HeroSection {
  headline: string;
  subheadline: string;
  ctaText: string;
  backgroundType: 'image' | 'video' | 'gradient';
  suggestedImageKeywords: string[];  // <-- Not used
}
```

### Proposed Enhancement
```typescript
interface HeroSection {
  headline: string;
  subheadline: string;
  ctaText: string;
  backgroundType: 'image' | 'video' | 'gradient';
  suggestedImageKeywords: string[];
  // New fields for actual media
  backgroundImageUrl?: string;   // Resolved stock or uploaded image
  backgroundVideoUrl?: string;   // Generated or uploaded video
  backgroundGradient?: string;   // CSS gradient fallback
  imageAltText?: string;         // AI-generated alt text
}
```

---

## Landing Page Renderer Updates

### Current Hero Rendering (simplified)
```tsx
<section className="relative py-20">
  <h1>{heroSection.config?.headline}</h1>
  <p>{heroSection.config?.subheadline}</p>
</section>
```

### Proposed Hero Rendering
```tsx
<section
  className="relative py-20 bg-cover bg-center"
  style={{
    backgroundImage: heroSection.config?.backgroundImageUrl
      ? `url(${heroSection.config.backgroundImageUrl})`
      : `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}05)`
  }}
>
  {/* Video background for Enterprise */}
  {heroSection.config?.backgroundVideoUrl && (
    <video
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    >
      <source src={heroSection.config.backgroundVideoUrl} type="video/mp4" />
    </video>
  )}

  {/* Overlay for text readability */}
  <div className="absolute inset-0 bg-black/40" />

  <div className="relative z-10">
    <h1>{heroSection.config?.headline}</h1>
    <p>{heroSection.config?.subheadline}</p>
  </div>
</section>
```

---

## Integration Detection

### Check Client Integrations
```typescript
// In funnel generation service
async function getVisualContentCapabilities(companyId: string) {
  const integrations = await integrationService.getActiveByCompany(companyId);

  return {
    hasCloudinary: integrations.some(i => i.provider === 'CLOUDINARY'),
    hasRunway: integrations.some(i => i.provider === 'RUNWAY'),
    hasOpenAI: integrations.some(i => i.provider === 'OPENAI'),
    tier: determineTier(integrations)
  };
}
```

---

## Metrics & Success Criteria

| Metric | Current | Target (with images) | Target (with video) |
|--------|---------|---------------------|---------------------|
| Conversion Rate | 0.5-1% | 2-3% | 4-6% |
| Time on Page | 30s | 60s | 120s |
| Bounce Rate | 70% | 50% | 35% |
| Social Shares | 0.1% | 0.5% | 2% |

---

## Security Considerations

1. **Image Validation:** Scan uploaded images for malware
2. **Content Moderation:** Use OpenAI moderation API for generated content
3. **Rate Limiting:** Limit video generation to prevent abuse
4. **Cost Controls:** Track Runway credits, alert on high usage
5. **CORS:** Ensure S3 bucket allows cross-origin for video playback

---

## Cost Analysis

### Cloudinary (Pro Tier)
- Free tier: 25GB bandwidth, 25K transformations/mo
- Paid: $89/mo for 225GB bandwidth
- Per-image cost: ~$0.002

### Runway (Enterprise)
- Credits: ~$0.05-0.10 per second of video
- 5-second video: ~$0.25-0.50
- Per-funnel estimate: $1-2 (if generating 4-5 videos)

### Unsplash (Free Tier)
- Free API: 50 requests/hour
- Unlimited for production apps
- Attribution required (can be hidden with Pro subscription $50/mo)

---

## Next Steps

1. [ ] Implement Unsplash service for stock images
2. [ ] Update landing page renderer to display hero images
3. [ ] Add Cloudinary processing pipeline for Pro clients
4. [ ] Create video generation queue for Enterprise clients
5. [ ] Update AI Funnel Generator to resolve image URLs
6. [ ] Add image/video upload to funnel builder UI

---

*Last Updated: December 30, 2025*
