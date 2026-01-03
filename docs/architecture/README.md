# Architecture Documentation

This directory contains architecture documentation for the AVNZ Payment Platform.

## Product Import System

The Product Import system enables vendors to import product catalogs from external integrations (Roastify, Shopify, etc.) with intelligent field mapping, image CDN import, and background processing.

### Core Documents

1. **[Product Import Specification](../roadmap/PRODUCT_IMPORT_SPECIFICATION.md)**
   - Feature requirements and user stories
   - Database schema and API endpoints
   - Field mapping system
   - Image import and storage tracking
   - Implementation phases

2. **[Scalability Architecture](./PRODUCT_IMPORT_SCALABILITY_ARCHITECTURE.md)** ⭐ NEW
   - Complete scalability and reliability design
   - Queue architecture with Redis cluster
   - Worker scaling (2-50 pods)
   - Job persistence and crash recovery
   - Rate limiting and backpressure
   - Monitoring and observability
   - Failure modes and recovery procedures
   - Infrastructure configuration (47 pages)

3. **[Implementation Checklist](./PRODUCT_IMPORT_IMPLEMENTATION_CHECKLIST.md)** ⭐ NEW
   - 7-phase implementation plan (6-7 weeks)
   - Infrastructure setup (Redis, ECS, auto-scaling)
   - Queue resilience (orphan detection, graceful shutdown)
   - Rate limiting and circuit breakers
   - Monitoring and alerting
   - Disaster recovery and runbooks
   - Production deployment steps

4. **[Executive Summary](./PRODUCT_IMPORT_SCALABILITY_SUMMARY.md)** ⭐ NEW
   - High-level overview for leadership
   - Architecture diagram
   - Cost analysis
   - Risk mitigation
   - Success criteria

### Infrastructure Code

**[Terraform Module](../../terraform/modules/product-import/)** ⭐ NEW
- ElastiCache Redis cluster (1 primary + 2 replicas)
- ECS Fargate worker service
- Application auto-scaling (queue depth + CPU)
- CloudWatch alarms and dashboards
- IAM roles and security groups
- Complete with README and usage examples

## Design Principles

### Scalability
- Horizontal scaling from 2 to 50+ workers
- Auto-scaling based on queue depth (target: 10 jobs/worker)
- Handles 1000+ concurrent imports across all clients

### Reliability
- Zero data loss guarantee (two-phase commit)
- Crash recovery (orphan detection every 5 minutes)
- Automatic failover (Redis cluster <60s)
- Idempotent operations (all phases can be re-executed)
- Graceful shutdown (30s drain time)

### Observability
- CloudWatch metrics (queue depth, job duration, success rate)
- Structured logging (JSON format with correlation IDs)
- Real-time dashboards (queue health, worker scaling, provider APIs)
- PagerDuty alerts for critical issues
- Runbooks for common failure scenarios

### Cost Efficiency
- $1,600/month infrastructure (production)
- $0.018/job average cost (1.8 cents)
- Cost per job decreases with volume
- Auto-scaling prevents over-provisioning

## Quick Links

### Development
- [Product Import Feature Spec](../roadmap/PRODUCT_IMPORT_SPECIFICATION.md)
- [Implementation Checklist](./PRODUCT_IMPORT_IMPLEMENTATION_CHECKLIST.md)
- [Terraform Module](../../terraform/modules/product-import/)

### Operations
- [Scalability Architecture](./PRODUCT_IMPORT_SCALABILITY_ARCHITECTURE.md)
- [Monitoring & Alerts](#monitoring--observability)
- [Disaster Recovery](#failure-modes--recovery)

### Leadership
- [Executive Summary](./PRODUCT_IMPORT_SCALABILITY_SUMMARY.md)
- [Cost Analysis](#infrastructure-costs)
- [Success Criteria](#success-criteria)

## Implementation Status

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Infrastructure | 📋 Planned | 0% |
| Phase 2: Queue Resilience | 📋 Planned | 0% |
| Phase 3: Rate Limiting | 📋 Planned | 0% |
| Phase 4: Monitoring | 📋 Planned | 0% |
| Phase 5: Backpressure | 📋 Planned | 0% |
| Phase 6: Disaster Recovery | 📋 Planned | 0% |
| Phase 7: Production Deployment | 📋 Planned | 0% |

**Estimated Timeline:** 6-7 weeks
**Target Production Date:** February 2026

## Support

For questions or clarifications:
- Architecture: architecture-team@avnz.io
- DevOps: devops-team@avnz.io
- Engineering: engineering-leads@avnz.io

---

*Last Updated: December 28, 2025*
