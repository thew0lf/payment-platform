# Founders Landing Page Specification

> **Domain:** `founders.avnz.io`
> **Purpose:** Pre-launch waitlist with viral referral system using NCI psychology principles
> **Stack:** Next.js 14 + Vercel Postgres + Tailwind CSS
> **Location:** `apps/founders-landing/`

---

## Progress Tracker

### Phase 1: Foundation
- [ ] Create Next.js 14 app in `apps/founders-landing/`
- [ ] Configure Tailwind CSS with dark mode
- [ ] Set up Vercel Postgres connection
- [ ] Create database schema (founders, referrals tables)
- [ ] Configure environment variables

### Phase 2: Core Features
- [ ] Build signup form component
- [ ] Implement founder number generation (FND-XXXX)
- [ ] Create referral code system
- [ ] Build position tracking logic
- [ ] Create success page with referral sharing

### Phase 3: Notifications
- [ ] Integrate AWS SES for welcome emails
- [ ] Integrate Twilio for SMS verification
- [ ] Email verification flow
- [ ] SMS verification flow

### Phase 4: Polish
- [ ] Add light/dark/system theme toggle
- [ ] Create hero video with Runway
- [ ] Add animations and transitions
- [ ] Mobile responsive optimization
- [ ] Accessibility audit

### Phase 5: Growth & Launch
- [ ] Integrate LaunchDarkly for A/B testing
- [ ] Configure Route 53 subdomain
- [ ] Deploy to Vercel
- [ ] SSL verification
- [ ] Go live

---

## 1. Overview

### Value Proposition
"Let's build something great together" - A co-founder community for the avnz.io platform where early adopters get:
- **Founder identity** (FND-XXXX number)
- **Early access** to all features
- **Direct input** on product roadmap
- **Lifetime founder pricing**
- **Priority support**

### Key Metrics
- Signups (total founders)
- Referral rate (referrals per founder)
- Viral coefficient (K-factor)
- Position movements (engagement)

---

## 2. Database Schema

### Vercel Postgres

```sql
-- Founders table
CREATE TABLE founders (
  id SERIAL PRIMARY KEY,
  founder_number VARCHAR(8) UNIQUE NOT NULL,  -- FND-0001
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  base_position INT NOT NULL,                  -- Original signup position
  current_position INT NOT NULL,               -- After referral boosts
  referral_code VARCHAR(8) UNIQUE NOT NULL,    -- FND-0247
  referred_by VARCHAR(8),                      -- Referral code of referrer
  referral_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',         -- active, verified, converted
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'                  -- A/B test variant, UTM, etc.
);

-- Referrals tracking
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INT REFERENCES founders(id),
  referred_id INT REFERENCES founders(id),
  position_boost INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_founders_email ON founders(email);
CREATE INDEX idx_founders_referral_code ON founders(referral_code);
CREATE INDEX idx_founders_current_position ON founders(current_position);
```

### Referral Position Logic

```typescript
// When a new founder signs up with referral code
async function processReferral(referrerCode: string, newFounderId: number) {
  const referrer = await db.query(
    'SELECT id, current_position FROM founders WHERE referral_code = $1',
    [referrerCode]
  );

  if (referrer) {
    // Boost referrer's position by 10
    await db.query(
      'UPDATE founders SET current_position = current_position - 10, referral_count = referral_count + 1 WHERE id = $1',
      [referrer.id]
    );

    // Record the referral
    await db.query(
      'INSERT INTO referrals (referrer_id, referred_id, position_boost) VALUES ($1, $2, 10)',
      [referrer.id, newFounderId]
    );
  }
}
```

---

## 3. UI/UX Design

### Landing Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]                              [Theme Toggle] [Login] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     "Let's Build Something Great Together"                  │
│                                                             │
│     Join [X] founders shaping the future of                 │
│     intelligent commerce with MI™                           │
│                                                             │
│     ┌─────────────────────────────────────────────┐        │
│     │  Email                                      │        │
│     ├─────────────────────────────────────────────┤        │
│     │  Phone (optional)                           │        │
│     ├─────────────────────────────────────────────┤        │
│     │  [    Claim Your Founder Number    ]        │        │
│     └─────────────────────────────────────────────┘        │
│                                                             │
│     "You build it, we take it to market"                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  WHAT WE'RE BUILDING                                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │   MI™   │  │ Social  │  │ Vendor  │  │ Growth  │        │
│  │   AI    │  │ Payments│  │ Network │  │ Tools   │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
├─────────────────────────────────────────────────────────────┤
│  FOUNDER BENEFITS                                           │
│  • Early access to all features                            │
│  • Direct input on product roadmap                         │
│  • Lifetime founder pricing                                │
│  • Priority support channel                                │
├─────────────────────────────────────────────────────────────┤
│  Footer: © 2025 avnz.io | Privacy | Terms                  │
└─────────────────────────────────────────────────────────────┘
```

### Success Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     🎉 Welcome, Founder FND-0247                            │
│                                                             │
│     You're #247 of 1,234 founders                          │
│                                                             │
│     ┌─────────────────────────────────────────────┐        │
│     │  Share & Move Up                             │        │
│     │                                              │        │
│     │  Your referral link:                         │        │
│     │  founders.avnz.io/?ref=FND-0247             │        │
│     │                                              │        │
│     │  [Copy Link] [Share Twitter] [Share Email]  │        │
│     │                                              │        │
│     │  Each referral = +10 positions              │        │
│     └─────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. NCI Psychology Principles

| Principle | Implementation |
|-----------|----------------|
| **Identity Transformation** | "Founder FND-XXXX" creates new identity |
| **Commitment & Consistency** | Public founder number = psychological commitment |
| **Social Proof** | "Join X founders" + live counter |
| **Scarcity** | Limited founder numbers (FND-0001 to FND-9999) |
| **Reciprocity** | "We build together" = partnership feeling |
| **Authority** | MI™ (Momentum Intelligence) branding |
| **Loss Aversion** | Position tracking creates FOMO |

---

## 5. Copy & Messaging

### Headlines (A/B Test Variants)
- **A:** "Let's Build Something Great Together"
- **B:** "Join the Founders Shaping Intelligent Commerce"
- **C:** "Your Founder Number is Waiting"

### Subheadlines
- "You build it, we take it to market"
- "Powered by Momentum Intelligence™"

### Value Props
1. **MI™ (Momentum Intelligence)** - AI that learns your business
2. **Social Payment Platform** - Connect with vendors and founders
3. **Vendor Network** - Pre-vetted fulfillment partners
4. **Growth Tools** - Funnels, subscriptions, analytics

### CTA Variants
- **A:** "Claim Your Founder Number"
- **B:** "Join as a Founder"
- **C:** "Reserve Your Spot"

---

## 6. Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                       │
│                    (Auto SSL via Let's Encrypt)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Next.js 14 App Router                                     │
│   ├── / (landing page)                                      │
│   ├── /success/[code] (post-signup)                        │
│   ├── /api/signup (POST)                                   │
│   ├── /api/verify/email (POST)                             │
│   ├── /api/verify/sms (POST)                               │
│   ├── /api/position/[code] (GET)                           │
│   └── /api/stats (GET)                                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Integrations (via Platform API)                           │
│   ├── Vercel Postgres (founders, referrals)                │
│   ├── LaunchDarkly (A/B testing)                           │
│   ├── AWS SES (email notifications)                        │
│   ├── Twilio (SMS verification)                            │
│   └── Runway (hero video - pre-generated)                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   DNS (Route 53)                                            │
│   founders.avnz.io → CNAME → cname.vercel-dns.com          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signup` | POST | Register new founder |
| `/api/verify/email` | POST | Verify email token |
| `/api/verify/sms` | POST | Verify SMS code |
| `/api/position/[code]` | GET | Get founder position |
| `/api/referrals/[code]` | GET | Get referral stats |
| `/api/stats` | GET | Public founder count |

### Signup Request/Response

```typescript
// POST /api/signup
interface SignupRequest {
  email: string;
  phone?: string;
  referralCode?: string;  // FND-XXXX of referrer
  metadata?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    variant?: string;  // A/B test variant
  };
}

interface SignupResponse {
  success: boolean;
  founder: {
    founderNumber: string;  // FND-0247
    referralCode: string;   // FND-0247 (same as founder number)
    position: number;
    totalFounders: number;
  };
  referralLink: string;     // https://founders.avnz.io/?ref=FND-0247
}
```

---

## 8. File Structure

```
apps/founders-landing/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── .env.example
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── success/[code]/page.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── signup/route.ts
│   │       ├── verify/
│   │       │   ├── email/route.ts
│   │       │   └── sms/route.ts
│   │       ├── position/[code]/route.ts
│   │       ├── referrals/[code]/route.ts
│   │       └── stats/route.ts
│   ├── components/
│   │   ├── signup-form.tsx
│   │   ├── founder-badge.tsx
│   │   ├── position-tracker.tsx
│   │   ├── referral-share.tsx
│   │   ├── theme-toggle.tsx
│   │   ├── feature-cards.tsx
│   │   ├── benefits-list.tsx
│   │   └── hero-video.tsx
│   ├── lib/
│   │   ├── db.ts
│   │   ├── founder-number.ts
│   │   ├── referral.ts
│   │   ├── notifications.ts
│   │   ├── launchdarkly.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
└── public/
    ├── logo.svg
    ├── og-image.png
    └── videos/
        └── hero.mp4
```

---

## 9. Environment Variables

```bash
# Vercel Postgres (auto-populated by Vercel)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

# LaunchDarkly
LAUNCHDARKLY_SDK_KEY=
NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID=

# Platform API (for SES/Twilio)
PLATFORM_API_URL=https://api.avnz.io
PLATFORM_API_KEY=

# App Config
NEXT_PUBLIC_BASE_URL=https://founders.avnz.io
NEXT_PUBLIC_APP_NAME=avnz.io Founders
```

---

## 10. Dependencies

```json
{
  "dependencies": {
    "next": "14.0.0",
    "react": "^18",
    "react-dom": "^18",
    "@vercel/postgres": "^0.5.0",
    "next-themes": "^0.2.1",
    "lucide-react": "^0.294.0",
    "sonner": "^2.0.7",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.1.0",
    "launchdarkly-react-client-sdk": "^3.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10",
    "postcss": "^8",
    "tailwindcss": "^3",
    "typescript": "^5"
  }
}
```

---

## 11. Deployment

### DNS Setup (Route 53)

```
Record Type: CNAME
Name: founders
Value: cname.vercel-dns.com
TTL: 300
```

### Vercel Configuration

1. Connect GitHub repo to Vercel
2. Set root directory: `apps/founders-landing`
3. Framework preset: Next.js
4. Add environment variables
5. Add custom domain: `founders.avnz.io`
6. SSL: Automatic (Let's Encrypt)

### CI/CD

- Push to `main` → Production deploy
- Push to any branch → Preview deploy
- PRs get automatic preview URLs

---

## 12. Analytics & Tracking

### Events to Track

| Event | Properties |
|-------|------------|
| `page_view` | page, referrer, variant |
| `signup_started` | variant, has_referral |
| `signup_completed` | founder_number, position, referred_by |
| `referral_shared` | founder_number, share_method |
| `referral_converted` | referrer, referred |

### A/B Test Variants

| Test | Variants | Metric |
|------|----------|--------|
| Headline | A, B, C | Signup rate |
| CTA | A, B, C | Click rate |
| Hero video | On/Off | Engagement |

---

## Appendix: Founder Number Format

- Format: `FND-XXXX` (4 digits, zero-padded)
- Range: `FND-0001` to `FND-9999`
- Assignment: Sequential on signup
- Referral code: Same as founder number

### Generation Logic

```typescript
async function generateFounderNumber(): Promise<string> {
  const result = await db.query(
    'SELECT COUNT(*) as count FROM founders'
  );
  const nextNumber = (result.rows[0].count + 1).toString().padStart(4, '0');
  return `FND-${nextNumber}`;
}
```

---

*Last Updated: December 6, 2025*
