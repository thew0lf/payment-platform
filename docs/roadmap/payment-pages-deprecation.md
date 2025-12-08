# Payment Pages Deprecation Plan

## Status: REMOVED

**Decision Date:** December 7, 2025
**Removal Date:** December 7, 2025

## Future: Lead Generation Pages
The Marketing section will be expanded with Lead Generation Pages for the lead capture program. This will integrate with the existing Leads module (`apps/api/src/leads/`).

---

## Summary

Payment Pages is being deprecated in favor of the Funnels system with the new Checkout Builder. This consolidates two parallel checkout systems into one, reducing maintenance burden and providing a better developer/user experience.

## Rationale

1. **Duplicate Functionality**: Both systems create hosted checkout pages
2. **No Lead Integration**: Payment Pages lacks progressive lead capture (Funnels has it built-in)
3. **Modern UI**: Funnels + Checkout Builder has the new Stripe-style interface
4. **Maintenance Cost**: Two parallel systems means double the bug surface
5. **Simpler Mental Model**: One checkout system is easier for users to understand

---

## Feature Parity Checklist

Features that need to migrate from Payment Pages to Funnels before removal:

### Already in Funnels ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Checkout page creation | ✅ | Via Checkout Builder |
| Multi-gateway support | ✅ | In funnel-payment.service.ts |
| Card encryption | ✅ | AES-256-GCM with 15-min TTL |
| Session tracking | ✅ | Full funnel session analytics |
| Lead capture | ✅ | Progressive capture on blur |
| Templates | ✅ | Funnel templates system |
| Stage-based flow | ✅ | Native to funnels |

### Needs Migration 🔄

| Feature | Priority | Effort | Target |
|---------|----------|--------|--------|
| **AI Analytics/Insights** | HIGH | Medium | Port from payment-pages/analytics |
| **Themes Gallery** | MEDIUM | Low | Adapt theme system to checkout-builder |
| **Custom Domains** | HIGH | Medium | Move to funnel/company level |
| **Page Type Variants** | LOW | Low | Donation, Subscription, Invoice |
| **A/B Testing** | MEDIUM | Medium | Add variant support to stages |
| **Conversion Funnel Viz** | HIGH | Low | Already have stage analytics |

### Payment Pages Exclusive (May Not Need)

| Feature | Decision |
|---------|----------|
| Browse/Gallery view | Skip - Templates serves this purpose |
| Standalone page stats | Skip - Funnel analytics is better |

---

## Migration Path

### Phase 1: Soft Deprecation (Current)
- [x] Add deprecation notice to Payment Pages UI
- [ ] Update documentation to recommend Funnels
- [ ] Stop new feature development on Payment Pages

### Phase 2: Feature Porting
- [ ] Port AI insights to Funnel analytics
- [ ] Add theme support to Checkout Builder
- [ ] Implement custom domains at company/funnel level
- [ ] Add A/B testing to funnel stages

### Phase 3: Data Migration
- [ ] Create migration script for existing Payment Pages → Funnels
- [ ] Notify users with active Payment Pages
- [ ] Provide migration wizard in UI

### Phase 4: Removal
- [ ] Remove Payment Pages routes
- [ ] Remove Payment Pages API endpoints
- [ ] Remove database models (soft delete existing data)
- [ ] Update navigation

---

## Code Locations

### Payment Pages (To Remove)

**Frontend:**
```
apps/admin-dashboard/src/app/(dashboard)/payment-pages/
├── page.tsx              # Main list
├── [id]/page.tsx         # Edit page
├── analytics/page.tsx    # AI insights (PORT THIS)
├── browse/page.tsx       # Gallery view
├── domains/page.tsx      # Custom domains (PORT THIS)
├── preview/[id]/page.tsx # Preview
├── templates/page.tsx    # Templates
└── themes/page.tsx       # Theme gallery (PORT THIS)

apps/admin-dashboard/src/lib/api/payment-pages.ts  # API client
```

**Backend:**
```
apps/api/src/payment-pages/  # If exists, remove
```

### Funnels (Keep & Enhance)

**Frontend:**
```
apps/admin-dashboard/src/app/(dashboard)/funnels/
├── page.tsx                    # Funnel list
├── [id]/analytics/page.tsx     # Funnel analytics (ENHANCE)
├── builder/page.tsx            # Stage builder
├── checkout-builder/page.tsx   # Checkout config
└── templates/page.tsx          # Templates
```

**Backend:**
```
apps/api/src/funnels/          # Keep all
apps/api/src/leads/            # Keep all
```

---

## User Communication

### In-App Notice (Add to Payment Pages)
```
⚠️ Payment Pages is being consolidated into Funnels
We're moving to a unified checkout experience. Your existing pages will
continue to work, but we recommend creating new checkouts using Funnels.
[Learn More] [Go to Funnels]
```

### Migration Guide (For Docs)
1. Go to Funnels → Create New Funnel
2. Add a Checkout stage
3. Use Checkout Builder to configure
4. Copy your page settings (headline, colors, etc.)
5. Update your links to new funnel URL

---

## Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Soft Deprecation | Week 1 | Warning banner live |
| Feature Porting | Weeks 2-4 | AI insights, themes, domains ported |
| Migration Period | Weeks 5-8 | User migration + support |
| Hard Deprecation | Week 9+ | Remove code, redirect routes |

---

## Rollback Plan

If issues arise during migration:
1. Keep Payment Pages routes functional (just hidden from nav)
2. Re-enable via feature flag if needed
3. Allow manual toggle in company settings

---

*Last Updated: December 7, 2025*
