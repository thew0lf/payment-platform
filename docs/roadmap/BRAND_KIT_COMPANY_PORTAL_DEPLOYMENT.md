# Brand Kit Company Portal Deployment Plan

**Document Version:** 1.0
**Created:** December 31, 2025
**Status:** Ready for Deployment

---

## 1. Summary of Changes

This deployment introduces a comprehensive Brand Kit system for the Company Portal application, enabling dynamic branding for public-facing funnels. The system resolves brand settings from funnel-specific, company-level, and default configurations with proper fallback hierarchy.

### New Files Created

| File | Purpose |
|------|---------|
| `src/contexts/brand-context.tsx` | BrandProvider context and useBrand hook |
| `src/contexts/brand-context.spec.tsx` | Unit tests for BrandProvider (60 tests) |
| `src/lib/brand-kit-resolver.ts` | Brand kit resolution with fallback logic |
| `src/lib/brand-kit-resolver.spec.ts` | Unit tests for resolver (98 tests) |
| `src/lib/color-utils.ts` | WCAG color utilities (contrast, accessibility) |
| `src/lib/color-utils.spec.ts` | Unit tests for color utilities (87 tests) |
| `src/components/brand/LogoDisplay.tsx` | Logo display with context/size variants |
| `src/components/brand/LogoDisplay.spec.tsx` | Unit tests for LogoDisplay (42 tests) |
| `src/components/brand/ColorPalette.tsx` | Color palette preview component |
| `src/components/brand/ColorPalette.spec.tsx` | Unit tests for ColorPalette (35 tests) |
| `src/components/brand/BrandedButton.tsx` | Button using brand CSS variables |
| `src/components/brand/BrandedButton.spec.tsx` | Unit tests for BrandedButton (48 tests) |
| `src/components/brand/FontLoader.tsx` | Google Fonts loader with preconnect |
| `src/components/brand/FontLoader.spec.tsx` | Unit tests for FontLoader (52 tests) |
| `src/components/brand/TypographyPreview.tsx` | Typography scale preview component |
| `src/components/brand/TypographyPreview.spec.tsx` | Unit tests for TypographyPreview (58 tests) |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/api.ts` | Added BrandKit, BrandKitLogo, BrandKitColors, BrandKitTypography types; Updated Funnel and FunnelCompany interfaces |
| `src/components/funnel/funnel-renderer.tsx` | Integrated BrandProvider, FontLoader, LogoDisplay; CSS variable application |
| `src/app/f/[slug]/page.tsx` | Added favicon metadata integration via resolveBrandKit |
| `src/app/f/[slug]/page.spec.tsx` | Added tests for favicon metadata (12 tests) |

---

## 2. Database Changes

**No database changes required.**

This feature uses existing database structures:
- `Funnel.brandKit` - JSONB field (already exists)
- `Company.settings.brandKit` - Nested within JSONB settings field (already exists)

The brand kit resolver reads from these existing fields and applies fallback logic in the frontend.

---

## 3. API Changes

**No API changes required.**

This feature uses existing API endpoints:
- `GET /api/f/:seoSlug` - Returns funnel with `brandKit` and `company.settings.brandKit`

The brand-kit endpoints in `apps/api` (brand-kit.controller.ts, brand-kit.service.ts) are unchanged and continue to serve the admin dashboard.

---

## 4. Environment Variables

**No new environment variables required.**

Existing variables used:
- `NEXT_PUBLIC_API_URL` - API base URL (already configured)

---

## 5. Deployment Steps

### 5.1 Pre-Deployment Checks

```bash
# 1. Run all tests
cd apps/company-portal
npm test

# 2. Verify build succeeds
npm run build

# 3. Check for TypeScript errors
npm run type-check

# 4. Verify no linting errors
npm run lint
```

### 5.2 Deployment Order

1. **Deploy API (if any changes)** - No API changes in this release
2. **Deploy Company Portal**
   ```bash
   # Build production bundle
   npm run build

   # Deploy to hosting platform (Vercel, AWS, etc.)
   # No infrastructure changes required
   ```

### 5.3 Post-Deployment Verification

1. **Visual Verification**
   - Navigate to a published funnel (`/f/{seo-slug}`)
   - Verify logo displays correctly in header
   - Verify primary/secondary colors are applied
   - Verify custom fonts load (check Network tab for fonts.googleapis.com)
   - Verify favicon appears in browser tab

2. **Fallback Verification**
   - Test funnel with no brandKit (should use company defaults)
   - Test funnel with no company brandKit (should use system defaults)
   - Test funnel with partial brandKit (should merge with defaults)

3. **Performance Verification**
   - Verify fonts load with `display=swap` (no FOIT)
   - Verify preconnect links appear in page source
   - Check Lighthouse score for performance impact

---

## 6. Rollback Plan

### Immediate Rollback (< 5 minutes)

If critical issues are discovered:

1. **Revert to previous deployment**
   ```bash
   # On Vercel
   vercel rollback

   # On AWS/Docker
   docker pull $REGISTRY/company-portal:previous
   docker-compose up -d
   ```

2. **The rollback is safe because:**
   - No database changes were made
   - No API changes were made
   - The feature is entirely frontend-contained

### Partial Rollback

If only specific components have issues:

1. **Disable BrandProvider** (emergency):
   - In `funnel-renderer.tsx`, temporarily remove BrandProvider wrapper
   - Funnels will use legacy `settings.branding` only

2. **Disable FontLoader**:
   - In `funnel-renderer.tsx`, comment out `<FontLoader />`
   - Funnels will use system fonts

---

## 7. Testing Checklist

### Test Coverage Summary

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| brand-kit-resolver.spec.ts | 98 | Core resolution logic, merge functions, CSS variables |
| color-utils.spec.ts | 87 | WCAG contrast, hex conversion, accessibility checks |
| brand-context.spec.tsx | 60 | Provider, useBrand hook, memoization |
| LogoDisplay.spec.tsx | 42 | Logo variants, sizes, fallbacks, error states |
| ColorPalette.spec.tsx | 35 | Layouts, hex display, accessibility labels |
| BrandedButton.spec.tsx | 48 | Variants, sizes, loading states, touch targets |
| FontLoader.spec.tsx | 52 | Google Fonts URL generation, preconnect, system fonts |
| TypographyPreview.spec.tsx | 58 | Type scale, modular scale, compact/full modes |
| page.spec.tsx (favicon) | 12 | Favicon metadata, fallback priority |
| **Total** | **492** | |

### Manual Testing Checklist

- [ ] **Logo Display**
  - [ ] Full logo displays correctly
  - [ ] Icon logo displays on small screens
  - [ ] Placeholder shows when no logo configured
  - [ ] Image error handling shows placeholder

- [ ] **Colors**
  - [ ] Primary color applies to buttons
  - [ ] Secondary color applies to accents
  - [ ] CSS variables are set correctly
  - [ ] Dark mode compatibility (if applicable)

- [ ] **Typography**
  - [ ] Heading font loads and applies
  - [ ] Body font loads and applies
  - [ ] Font sizes follow configured scale
  - [ ] System fonts work when custom fonts not set

- [ ] **Favicon**
  - [ ] Custom favicon appears in browser tab
  - [ ] Fallback to logo icon works
  - [ ] Fallback to full logo works
  - [ ] Apple touch icon configured

- [ ] **Performance**
  - [ ] No flash of unstyled text (FOUT minimized)
  - [ ] Fonts load with display=swap
  - [ ] Preconnect hints present in HTML
  - [ ] No blocking font requests

---

## 8. Performance Considerations

### Font Loading Optimization

The FontLoader component implements several performance optimizations:

1. **Preconnect Hints**
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
   ```
   - Establishes early connection to Google Fonts CDN
   - Reduces DNS lookup and TLS handshake time

2. **Font Display Swap**
   ```
   display=swap
   ```
   - Uses system font immediately, swaps when custom font loads
   - Prevents FOIT (Flash of Invisible Text)
   - Ensures content is always readable

3. **System Font Detection**
   - System fonts (Arial, Helvetica, system-ui) are not loaded from Google
   - Reduces unnecessary network requests

### CSS Variable Caching

1. **Memoization in BrandProvider**
   - `useMemo` for brand kit resolution
   - `useMemo` for CSS variables object
   - `useMemo` for logo URLs
   - Prevents unnecessary recalculations on re-render

2. **CSS Variable Application**
   - Variables set once at provider level
   - Child components reference variables, not recalculate

### SSR Considerations

1. **FontLoader is RSC-Compatible**
   - No 'use client' directive
   - Can render in Server Components
   - Font links included in initial HTML

2. **BrandProvider is Client-Side**
   - Uses 'use client' for context
   - CSS variables applied via inline styles
   - Hydrates seamlessly

3. **Metadata Generation**
   - Favicon resolved server-side in `generateMetadata`
   - No client-side computation for SEO metadata

---

## 9. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Funnel Page Request                       │
│                   /f/{seo-slug}                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    page.tsx (Server)                         │
│  1. Fetch funnel from API                                   │
│  2. generateMetadata() - resolve favicon                    │
│  3. Render FunnelRenderer                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   BrandProvider (Client)                     │
│  1. resolveBrandKit(funnel, company.brandKit)               │
│  2. Generate CSS variables                                  │
│  3. Memoize logo URLs, fonts URL                           │
│  4. Provide context to children                             │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   FontLoader     │ │   LogoDisplay    │ │  BrandedButton   │
│                  │ │                  │ │                  │
│ - Google Fonts   │ │ - Logo variants  │ │ - CSS variables  │
│ - Preconnect     │ │ - Fallbacks      │ │ - Touch targets  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 10. Brand Kit Resolution Priority

```
Priority (highest to lowest):
┌─────────────────────────────────────────────────────────────┐
│ 1. Funnel-specific brandKit                                 │
│    funnel.brandKit                                          │
├─────────────────────────────────────────────────────────────┤
│ 2. Company-level brandKit                                   │
│    funnel.company.settings.brandKit                         │
├─────────────────────────────────────────────────────────────┤
│ 3. Legacy funnel branding (backward compatibility)          │
│    funnel.settings.branding                                 │
├─────────────────────────────────────────────────────────────┤
│ 4. Default brand kit                                        │
│    DEFAULT_BRAND_KIT in brand-kit-resolver.ts               │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Component Reference

### BrandProvider

```tsx
<BrandProvider funnel={funnel}>
  {/* All children have access to brand context */}
</BrandProvider>
```

### useBrand Hook

```tsx
const {
  brandKit,           // Fully resolved brand kit
  logoUrl,            // Primary logo URL
  iconLogoUrl,        // Icon logo URL
  monochromeLogoUrl,  // Monochrome logo URL
  reversedLogoUrl,    // Reversed (light) logo URL
  faviconUrl,         // Favicon URL
  cssVariables,       // CSS custom properties object
  googleFontsUrl,     // Google Fonts URL or null
  fontStyles,         // { heading, body } font-family styles
} = useBrand();
```

### CSS Variables Available

| Variable | Source |
|----------|--------|
| `--brand-primary` | brandKit.colors.primary |
| `--brand-secondary` | brandKit.colors.secondary |
| `--brand-accent` | brandKit.colors.accent |
| `--brand-background` | brandKit.colors.background |
| `--brand-text` | brandKit.colors.text |
| `--brand-success` | brandKit.colors.success |
| `--brand-warning` | brandKit.colors.warning |
| `--brand-error` | brandKit.colors.error |
| `--brand-font-heading` | brandKit.typography.headingFont |
| `--brand-font-body` | brandKit.typography.bodyFont |
| `--brand-font-size-base` | brandKit.typography.baseFontSize + 'px' |
| `--brand-heading-scale` | brandKit.typography.headingScale |

---

## 12. Approval Checklist

| Check | Status |
|-------|--------|
| All 492 tests passing | Pending |
| Build succeeds | Pending |
| No TypeScript errors | Pending |
| No linting errors | Pending |
| Manual testing complete | Pending |
| Performance verified | Pending |
| Rollback plan documented | Complete |

---

**Prepared by:** Claude Code
**Reviewed by:** [Pending]
**Approved by:** [Pending]
