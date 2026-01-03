# Custom Domain Pricing Tiers

## Overview

This document defines the pricing structure for custom domains across different subscription tiers. Custom domains allow companies to use their own branded URLs (e.g., `always305.com`, `shop.mybrand.com`) instead of platform subdomains.

---

## Tier Breakdown

### Founders Tier (Early Adopter)
**Monthly Price:** $0 (Lifetime free for founders)

| Feature | Included |
|---------|----------|
| Platform Subdomain | 1 (`company.avnz.io`) |
| Custom Domains | 3 |
| SSL Certificates | Included (auto-provisioned) |
| CDN Bandwidth | 100 GB/month |
| Site Types | All (Storefront, Funnel, Trial) |
| Domain Verification | Self-service |
| DNS Management | Self-service |
| Overage (Bandwidth) | $0.10/GB |

---

### Basic Tier
**Monthly Price:** $49/month

| Feature | Included |
|---------|----------|
| Platform Subdomain | 1 (`company.avnz.io`) |
| Custom Domains | 1 |
| SSL Certificates | Included |
| CDN Bandwidth | 50 GB/month |
| Site Types | Funnel only |
| Domain Verification | Self-service |
| DNS Management | Self-service |
| Additional Domains | $10/month each |
| Overage (Bandwidth) | $0.12/GB |

---

### Standard Tier
**Monthly Price:** $149/month

| Feature | Included |
|---------|----------|
| Platform Subdomain | 1 (`company.avnz.io`) |
| Custom Domains | 3 |
| SSL Certificates | Included |
| CDN Bandwidth | 250 GB/month |
| Site Types | Storefront, Funnel |
| Domain Verification | Self-service |
| DNS Management | Self-service + API |
| Additional Domains | $8/month each |
| Overage (Bandwidth) | $0.10/GB |
| Priority SSL Provisioning | Yes |

---

### Premium Tier
**Monthly Price:** $349/month

| Feature | Included |
|---------|----------|
| Platform Subdomain | Unlimited (`*.company.avnz.io`) |
| Custom Domains | 10 |
| SSL Certificates | Included + Wildcard support |
| CDN Bandwidth | 1 TB/month |
| Site Types | All (Storefront, Funnel, Trial, B2B) |
| Domain Verification | Self-service + Assisted |
| DNS Management | Full API + Terraform |
| Additional Domains | $5/month each |
| Overage (Bandwidth) | $0.08/GB |
| Priority SSL Provisioning | Yes |
| Custom CNAME | Yes |
| Dedicated IP Option | $20/month |

---

### Enterprise Tier
**Monthly Price:** Custom pricing (starting $999/month)

| Feature | Included |
|---------|----------|
| Platform Subdomain | Unlimited + Custom branding |
| Custom Domains | Unlimited |
| SSL Certificates | Included + EV certificates available |
| CDN Bandwidth | 5 TB/month (negotiable) |
| Site Types | All + Custom site types |
| Domain Verification | White-glove setup |
| DNS Management | Full API + Terraform + Dedicated support |
| Additional Domains | Included |
| Overage (Bandwidth) | $0.05/GB (negotiable) |
| Priority SSL Provisioning | Yes + SLA guarantee |
| Custom CNAME | Yes |
| Dedicated IP | Included |
| Multi-region CDN | Yes |
| DDoS Protection | Advanced |
| WAF Rules | Custom |
| Uptime SLA | 99.99% |

---

## Feature Comparison Matrix

| Feature | Basic | Standard | Premium | Enterprise |
|---------|-------|----------|---------|------------|
| **Domains** |
| Platform Subdomain | 1 | 1 | Unlimited | Unlimited |
| Custom Domains | 1 | 3 | 10 | Unlimited |
| Wildcard Domains | No | No | Yes | Yes |
| **Site Types** |
| Funnel Sites | Yes | Yes | Yes | Yes |
| Storefront Sites | No | Yes | Yes | Yes |
| Trial Sites | No | No | Yes | Yes |
| B2B Portal | No | No | Yes | Yes |
| Marketplace | No | No | No | Yes |
| **CDN & Performance** |
| CDN Bandwidth | 50 GB | 250 GB | 1 TB | 5 TB+ |
| Edge Locations | US/EU | US/EU/Asia | Global | Global + Custom |
| Image Optimization | Basic | Advanced | Advanced | Advanced + Custom |
| Video Streaming | No | No | Yes | Yes |
| **Security** |
| SSL/TLS | Yes | Yes | Yes | Yes |
| Wildcard SSL | No | No | Yes | Yes |
| EV Certificates | No | No | No | Yes |
| DDoS Protection | Basic | Basic | Standard | Advanced |
| WAF | No | Basic | Standard | Custom Rules |
| **Support** |
| DNS Setup Guide | Yes | Yes | Yes | Yes |
| Email Support | Yes | Yes | Yes | Yes |
| Priority Support | No | No | Yes | Yes |
| Dedicated CSM | No | No | No | Yes |
| SLA | No | No | 99.9% | 99.99% |

---

## Add-On Pricing

### Additional Domains
| Tier | Price per Domain |
|------|------------------|
| Basic | $10/month |
| Standard | $8/month |
| Premium | $5/month |
| Enterprise | Included |

### Bandwidth Overage
| Tier | Price per GB |
|------|--------------|
| Basic | $0.12 |
| Standard | $0.10 |
| Premium | $0.08 |
| Enterprise | $0.05 (negotiable) |

### Premium Add-Ons
| Add-On | Price | Available Tiers |
|--------|-------|-----------------|
| Dedicated IP | $20/month | Premium, Enterprise |
| EV Certificate | $100/month | Enterprise |
| Custom WAF Rules | $50/month | Premium, Enterprise |
| Multi-region Failover | $100/month | Enterprise |
| Advanced Analytics | $25/month | All |

---

## Technical Specifications

### SSL Certificate Provisioning

| Tier | Provisioning Time | Certificate Type |
|------|-------------------|------------------|
| Basic | 24-48 hours | Let's Encrypt (DV) |
| Standard | 12-24 hours | Let's Encrypt (DV) |
| Premium | 1-4 hours | Let's Encrypt (DV) or ACM |
| Enterprise | < 1 hour (SLA) | ACM + EV option |

### CDN Configuration

| Tier | Cache TTL | Edge Locations | Purge Limit |
|------|-----------|----------------|-------------|
| Basic | 1 hour default | 10 | 100/day |
| Standard | Configurable | 25 | 500/day |
| Premium | Configurable + API | 50+ | Unlimited |
| Enterprise | Custom + Real-time | 200+ | Unlimited |

### DNS Requirements

All custom domains require:
1. CNAME record pointing to `{company}.cdn.avnz.io`
2. TXT record for domain verification: `_avnz-verify.domain.com`
3. Optional: A record for apex domains (Enterprise only)

---

## Database Schema

```prisma
model DomainPricing {
  id          String @id @default(cuid())

  tier        PlanTier

  // Domain limits
  includedDomains      Int
  additionalDomainPrice Decimal @db.Decimal(10, 2)
  wildcardSupported    Boolean @default(false)

  // Bandwidth
  includedBandwidthGb  Int
  overagePricePerGb    Decimal @db.Decimal(10, 4)

  // Site types allowed
  allowedSiteTypes     SiteType[]

  // Features
  priorityProvisioning Boolean @default(false)
  dedicatedIpAvailable Boolean @default(false)
  dedicatedIpPrice     Decimal? @db.Decimal(10, 2)

  // SLA
  uptimeSla            Decimal? @db.Decimal(5, 2) // e.g., 99.99
  provisioningSlaMins  Int?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([tier])
  @@map("domain_pricing")
}

model CompanyDomainUsage {
  id          String @id @default(cuid())
  companyId   String

  // Current period
  periodStart DateTime
  periodEnd   DateTime

  // Usage
  customDomainCount Int @default(0)
  bandwidthUsedGb   Decimal @default(0) @db.Decimal(12, 4)

  // Billing
  additionalDomainCharges Decimal @default(0) @db.Decimal(10, 2)
  overageCharges          Decimal @default(0) @db.Decimal(10, 2)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id])

  @@unique([companyId, periodStart])
  @@index([companyId])
  @@map("company_domain_usage")
}
```

---

## Implementation Notes

### Enforcement Points

1. **Domain Creation**: Check company tier before allowing new custom domain
2. **Site Type Selection**: Validate site type is allowed for tier
3. **Bandwidth Monitoring**: Track CDN usage and trigger overage billing
4. **SSL Provisioning Queue**: Priority based on tier

### Upgrade Prompts

Display upgrade prompts when:
- User tries to add domain beyond limit
- User tries to create site type not in their tier
- Bandwidth usage exceeds 80% of included amount
- User requests features not in their tier (wildcard, dedicated IP)

### Billing Integration

- Domain add-ons billed monthly, pro-rated
- Bandwidth overages calculated daily, billed monthly
- Usage data synced to billing system hourly

---

## Founders Tier Special Considerations

The Founders tier is a lifetime early adopter plan with generous domain allowances:

| Benefit | Details |
|---------|---------|
| Price Lock | $0/month forever (no price increases) |
| Domain Limit | 3 custom domains included |
| All Site Types | Full access to all site types |
| Grandfather Rights | If features are removed from future tiers, Founders retain access |
| Priority Support | Founders get priority support queue access |
| Beta Features | Early access to new domain features |

### Founders Tier Eligibility

- Must sign up during founders period (limited to first 500 companies)
- Requires active use (at least one site published within 90 days)
- Non-transferable between companies
- Revoked if account is suspended for policy violations

---

## Migration Path

### Upgrading Tiers

When a company upgrades:
1. New domain limits apply immediately
2. New site types become available
3. Bandwidth allocation increases for current period
4. Pro-rated billing for the upgrade

### Downgrading Tiers

When a company downgrades:
1. Existing domains remain active until renewal
2. At renewal, excess domains are suspended (oldest first)
3. Sites using unavailable types are set to draft mode
4. 30-day grace period to migrate or upgrade

---

## API Endpoints

### Domain Pricing Information

```
GET /api/domain-pricing
GET /api/domain-pricing/:tier
GET /api/domain-pricing/compare
```

### Usage Tracking

```
GET /api/companies/:companyId/domain-usage
GET /api/companies/:companyId/domain-usage/history
GET /api/companies/:companyId/bandwidth-usage
```

### Domain Management

```
POST /api/domains                    # Create domain (checks tier limits)
GET  /api/domains                    # List company domains
GET  /api/domains/:id                # Get domain details
DELETE /api/domains/:id              # Remove domain
POST /api/domains/:id/verify         # Verify domain ownership
GET  /api/domains/:id/ssl-status     # Check SSL provisioning status
```

---

## Monitoring & Alerts

### Usage Alerts

| Threshold | Action |
|-----------|--------|
| 80% bandwidth | Email warning |
| 90% bandwidth | Dashboard banner + email |
| 100% bandwidth | Overage billing begins + notification |
| Domain limit reached | Upgrade prompt on next domain attempt |

### Operational Metrics

Track and alert on:
- SSL provisioning times vs SLA
- CDN cache hit rates by tier
- Domain verification success rates
- Bandwidth usage patterns

---

*Last Updated: December 31, 2025*
