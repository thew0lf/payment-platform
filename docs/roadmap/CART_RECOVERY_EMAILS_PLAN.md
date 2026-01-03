# Cart Recovery Email Templates - Implementation Plan

**Date:** January 2, 2026
**Feature:** Abandoned Cart Recovery Email Sequence
**Status:** Ready for Implementation

---

## Executive Summary

This plan covers the implementation of a 3-email abandoned cart recovery sequence that adapts to the funnel's marketing type. The default marketing type is **"Non-Verbal Communication Influence / Engineered Reality"** which creates immersive, aspirational experiences using psychological triggers and sensory language.

---

## Email Sequence Overview

| Email | Timing | Discount | Template Code | Primary Emotion |
|-------|--------|----------|---------------|-----------------|
| 1 | 1 hour | None | `abandoned-cart-1` | Anticipation |
| 2 | 24 hours | 10% off | `abandoned-cart-2` | Opportunity |
| 3 | 72 hours | 15% off | `abandoned-cart-3` | Resolution |

---

## Marketing Types Supported

### 1. Non-Verbal Communication Influence / Engineered Reality (DEFAULT)

**Strategy:** Creates sensory-rich, immersive experiences that make customers *feel* the absence of what they almost had. Not selling a product - selling the reality they were about to step into.

**Key Psychological Triggers:**
- Loss Aversion - Frame as losing the future self they envisioned
- Sensory Language - Engage multiple senses (how it feels, looks, sounds)
- Identity Alignment - "People like you" and "the version of you who..."
- Curiosity Gap - Leave something unresolved
- Temporal Displacement - Mental time-travel to life after purchase

**Tone Progression:**
| Email | Tone | Energy | Voice |
|-------|------|--------|-------|
| 1 | Warm, inviting, curious | Medium-high | Friend gently reminding |
| 2 | Reflective, aspirational | Medium | Thoughtful, shows care |
| 3 | Honest, genuine urgency | Medium-low with urgency spike | Respectful closure |

### 2. Direct Response
- Clear benefits, urgency-driven, no fluff
- Every sentence has one job: get them back to checkout

### 3. Story-Driven
- Narrative arc, transformation journey
- Customer is protagonist, abandonment is plot twist

### 4. Educational
- Value-first, trust-building, informative
- Address objections with facts

### 5. Social Proof Heavy
- Testimonials, reviews, FOMO
- "If others love it, I will too"

---

## Visual Design System

### Color Progression

| Email | Primary Palette | Psychological Intent |
|-------|-----------------|---------------------|
| 1 | Purple-Blue (#667eea → #764ba2) | Trust, Calm, Helpful |
| 2 | Green-Teal (#10b981 → #059669) | Value, Opportunity, Growth |
| 3 | Red-Orange (#dc2626 → #ea580c) | Urgency, Scarcity, Action |

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (80px)                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  [Logo]              [View in Browser] →          │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    HERO ZONE (Variable)                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │           [Headline + Subhead]                    │  │
│  │              [Primary CTA]                        │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                   CART PREVIEW                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │ Product │  │ Product │  │ Product │                 │
│  │  Image  │  │  Image  │  │  Image  │                 │
│  │  $XX.XX │  │  $XX.XX │  │  $XX.XX │                 │
│  └─────────┘  └─────────┘  └─────────┘                 │
│              Cart Total: $XXX.XX                        │
├─────────────────────────────────────────────────────────┤
│                   TRUST ZONE                            │
│  [Guarantee] [Shipping] [Support] [Security]            │
├─────────────────────────────────────────────────────────┤
│                    FOOTER                               │
│  Social Links | Unsubscribe | Legal | Address          │
└─────────────────────────────────────────────────────────┘
```

### Mobile-First Requirements

| Element | Minimum Size | Recommended Size |
|---------|--------------|------------------|
| Primary CTA | 48px height | 56px height |
| Secondary CTA | 44px height | 48px height |
| Social Icons | 44x44px | 48x48px |
| Unsubscribe Link | 44px tap area | 48px with padding |

### Accessibility Requirements

- WCAG 2.1 AA color contrast compliance
- Descriptive alt text for all product images
- Semantic HTML structure with proper heading hierarchy
- Screen reader friendly price announcements

---

## Email Copy (Engineered Reality Style)

### Email 1: The Gentle Nudge (1 Hour)

**Subject:** `Your cart's getting lonely, {{userName}}`
**Preview:** `Those items are still waiting. And honestly? They looked really good on you.`

**Opening Hook:**
> Something interrupted you earlier. Life happens - we get it. But before you move on, can we paint a quick picture?

**Body Theme:** Sensory visualization of receiving the package, no pressure approach

**CTA:** `Complete My Order`
**P.S.:** Fun fact about return customers

---

### Email 2: The Special Consideration (24 Hours)

**Subject:** `A little something for the undecided`
**Preview:** `We don't do this often. But for you, {{userName}}? Yeah, we're doing this.`

**Opening Hook:**
> You know that moment when you're standing in front of the fridge at midnight, door open, cold air on your face, just... deciding? That's where you are with your cart right now. Let us help you close the door.

**Body Theme:** Universe sending a sign, 10% as "special consideration" not desperation

**CTA:** `Claim My {{discountPercent}}% Off`
**P.S.:** Code expiration with "good pressure"

---

### Email 3: The Final Call (72 Hours)

**Subject:** `Last call, {{userName}}. We mean it this time.`
**Preview:** `15% off. Cart expires tonight. This is us being genuinely, honestly real with you.`

**Opening Hook:**
> This is the email where we're supposed to create fake urgency. Flashing timers, ALL CAPS warnings, the whole anxiety-inducing circus. But that's not us. So here's the truth instead:

**Body Theme:** Genuine scarcity (system clears carts), psychological closure, resolution

**CTA:** `Get My {{discountPercent}}% Off Before Midnight`
**Secondary CTA:** `I've moved on - clear my cart`
**P.S.:** Life with vs. without - trust that answer

---

## Handlebars Variables

```typescript
interface AbandonedCartEmailVariables {
  // Customer
  userName: string;
  email: string;

  // Cart
  cartItems: Array<{
    name: string;
    imageUrl: string;
    price: string;
    description?: string;
    originalPrice?: string;
    discountedPrice?: string;
    quantity: number;
  }>;
  cartTotal: string;
  discountedTotal?: string;

  // Discount
  discountPercent?: number;
  discountCode?: string;
  expiresIn?: string;

  // Brand
  companyName: string;
  logoUrl: string;
  supportEmail: string;

  // URLs
  recoveryUrl: string;
  unsubscribeUrl: string;
  preferencesUrl: string;

  // System
  currentYear: string;
}
```

---

## Implementation Steps

### Step 1: Create Email Template Seeds

Add templates to `apps/api/prisma/seeds/core/seed-email-templates.ts`:
- `abandoned-cart-1`
- `abandoned-cart-2`
- `abandoned-cart-3`

### Step 2: Update CartAbandonmentService

Modify to select template based on:
1. Funnel's `marketingType` setting
2. Time since abandonment
3. Default to "Engineered Reality" if not set

### Step 3: Add Marketing Type to Funnel Settings

```typescript
interface FunnelSettings {
  // ... existing settings
  marketingType?: 'ENGINEERED_REALITY' | 'DIRECT_RESPONSE' | 'STORY_DRIVEN' | 'EDUCATIONAL' | 'SOCIAL_PROOF';
}
```

### Step 4: Discount Code Generation

- Email 2: Generate `COMEBACK10` or unique per-user code
- Email 3: Generate `LASTCHANCE15` or unique per-user code
- Single-use codes for tracking

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Email 1 Open Rate | > 40% |
| Email 2 Open Rate | > 35% |
| Email 3 Open Rate | > 30% |
| Overall Recovery Rate | > 10% |
| Discount Code Usage | > 60% of recoveries |

---

## Testing Checklist

- [ ] Email renders in Gmail, Outlook, Apple Mail
- [ ] Mobile responsive at 320px, 375px, 414px
- [ ] Touch targets meet 48px minimum
- [ ] Color contrast passes WCAG AA
- [ ] All Handlebars variables render correctly
- [ ] Discount codes auto-apply on CTA click
- [ ] UTM parameters tracked correctly
- [ ] Unsubscribe link works

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| CMO | | | |
| Head of Design | | | |
| Senior Copywriter | | | |
| Senior Developer | | | |

---

*Created by consolidating stakeholder input from CMO, Head of Design, and Senior Copywriter.*
