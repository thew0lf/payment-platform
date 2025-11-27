# Payment Platform Documentation

A hierarchical multi-tenant payment orchestration platform designed for agencies managing subscription businesses.

## Quick Start
```bash
# Clone repository
git clone [your-repo-url]
cd payment-platform

# Set up development environment
make setup

# Start all services
make start
```

## Architecture

This platform serves a hierarchical structure:
- **Organizations**: Platform owners (avnz.io)
- **Clients**: Agencies managing multiple companies
- **Companies**: Individual subscription businesses  
- **Departments**: Functional units within companies
- **Users**: People with role-based access at any level

## Technology Stack

- **Backend**: Nest.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: Next.js 14 with Tailwind CSS
- **Queue**: Bull + Redis for payment processing
- **Auth**: Auth0 + custom RBAC
- **Deployment**: Docker → Container Platform → Cloud → K8s

## Services

- **API**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3002
- **Company Portal**: http://localhost:3003
- **PgAdmin**: http://localhost:5050
- **Redis Commander**: http://localhost:8081

## Development

See [Development Guide](guides/development.md) for detailed development instructions.

## Continuity Framework

The platform integrates Chase Hughes' NCI (Non-Verbal Communication Influence) and Engineered Reality principles for payment optimization:

- **Behavioral Momentum**: Maintain psychological commitment through the payment flow
- **Trust Architecture**: Build trust through environmental cues and social proof
- **Friction Calibration**: Strategic friction - reduced for legitimate actions, added to prevent errors
- **Cognitive Continuity**: Consistent mental models and reduced cognitive load

See [Continuity Framework Documentation](CONTINUITY_FRAMEWORK.md) for detailed implementation.

### Continuity API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/continuity/config` | Get current configuration |
| `PUT /api/continuity/config` | Update configuration |
| `POST /api/continuity/flow` | Start payment flow |
| `GET /api/continuity/flow/:id` | Get flow state |
| `POST /api/continuity/friction/calculate` | Calculate friction level |
| `GET /api/continuity/trust-signals` | Get trust signals |
| `GET /api/continuity/metrics` | Get continuity metrics |

## Documentation

- [Architecture Overview](architecture/README.md)
- [API Documentation](api/README.md)
- [Continuity Framework](CONTINUITY_FRAMEWORK.md)
- [Deployment Guide](guides/deployment.md)
# Payment Platform - Claude Code Instructions

## Project Structure

```
payment-platform/
├── apps/
│   ├── api/                 # NestJS backend API (port 3001)
│   └── admin-dashboard/     # Next.js 14 frontend (port 3000)
├── packages/
│   └── shared/              # Shared types and utilities
├── docker/                  # Docker configuration
├── prisma/                  # Database schema and migrations
└── docs/                    # Documentation
```

## Current Status (November 27, 2025)

| Feature | Backend | UI | Notes |
|---------|---------|-----|-------|
| Integrations Framework | ✅ Complete | 🔲 Pending | Feature 01 |
| Auth & RBAC | 🔲 Pending | 🔲 Pending | Week 1-2 |
| Multi-Account Providers | 🔲 Pending | 🔲 Pending | Phase 2 |
| Gateway Rule Engine | 🔲 Pending | 🔲 Pending | Phase 3 |

---

## API Configuration

### CRITICAL: Global API Prefix

**The NestJS API has a global prefix `/api` for ALL routes.**

When creating frontend API calls, always include the `/api` prefix:

```typescript
// Backend controller definition
@Controller('admin/integrations')

// Frontend must call with /api prefix
fetch('/api/admin/integrations/...')
```

### Route Mapping Examples

| Backend Route | Frontend API Call |
|---------------|-------------------|
| `admin/integrations/platform` | `/api/admin/integrations/platform` |
| `admin/integrations/definitions` | `/api/admin/integrations/definitions` |
| `integrations` | `/api/integrations` |
| `integrations/:id/test` | `/api/integrations/:id/test` |
| `auth/login` | `/api/auth/login` |
| `dashboard/metrics` | `/api/dashboard/metrics` |

### API Base URL

- **Development:** `http://localhost:3001`
- **Environment Variable:** `NEXT_PUBLIC_API_URL`

---

## Development Commands

### Docker (Primary Development Method)

```bash
# Start all services
make start

# Stop all services
make stop

# View logs
make logs

# Rebuild containers
make rebuild

# Alternative: Direct docker-compose
docker-compose up -d
docker-compose down
docker-compose logs -f api
```

### Individual Apps

```bash
# API Server
cd apps/api && npm run dev

# Admin Dashboard
cd apps/admin-dashboard && npm run dev
```

### Database (Prisma)

```bash
# Run migrations
cd apps/api && npx prisma migrate dev

# Generate Prisma client after schema changes
cd apps/api && npx prisma generate

# Seed database
cd apps/api && npx prisma db seed

# Open Prisma Studio (GUI)
cd apps/api && npx prisma studio

# Reset database (caution: destroys data)
cd apps/api && npx prisma migrate reset
```

### Turborepo (Monorepo Commands)

```bash
# Start all apps in dev mode
npm run dev

# Build all apps
npm run build

# Lint all apps
npm run lint

# Type check
npm run typecheck
```

### Testing

```bash
# Run all tests
npm run test

# Run API tests
cd apps/api && npm run test

# Run e2e tests
cd apps/api && npm run test:e2e

# Watch mode
cd apps/api && npm run test:watch
```

---

## Authentication

- **Method:** JWT-based authentication
- **Token Storage:** localStorage as `avnz_token`
- **Header:** Include `Authorization: Bearer <token>` in API requests

```typescript
// Example API call with auth
const response = await fetch('/api/admin/integrations/platform', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('avnz_token')}`,
    'Content-Type': 'application/json'
  }
});
```

---

## Key Architecture Patterns

### Hierarchy Model

```
Organization (avnz.io)
└── Client (Agency)
    └── Company (Agency's Customer)
        └── Department
            └── User
```

### Credential Management

- **Never hardcode credentials** - All integrations are UI-configurable
- **Encryption:** AES-256-GCM for sensitive data
- **Storage:** Database with encrypted credentials column
- **Audit:** All credential access is logged

### Integration Options

Clients can either:
1. **Use Platform Gateway** - avnz.io's merchant accounts (fee: 0.5% + $0.10/txn)
2. **Use Own Credentials** - Client's own merchant accounts (no markup)

---

## Environment Variables

### Required for API (`apps/api/.env`)

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/payment_platform"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Encryption Key (for credential encryption - AES-256-GCM)
ENCRYPTION_KEY=32-byte-hex-key-here

# Environment
NODE_ENV=development
```

### Required for Dashboard (`apps/admin-dashboard/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### ⚠️ What's NOT in .env Files

Per the Integrations Framework spec, these are stored in the **PlatformIntegration** table (Org-level, encrypted), NOT in environment files:

| Service | Storage Location |
|---------|------------------|
| Auth0 (domain, audience, secret) | `PlatformIntegration` table |
| AWS SES credentials | `PlatformIntegration` table |
| AWS Bedrock credentials | `PlatformIntegration` table |
| Datadog/Sentry API keys | `PlatformIntegration` table |
| Payment gateway credentials | `ClientIntegration` or `PlatformIntegration` table |

All credentials are encrypted with AES-256-GCM and configurable via the admin UI.

---

## File Naming Conventions

- **Controllers:** `*.controller.ts`
- **Services:** `*.service.ts`
- **Modules:** `*.module.ts`
- **DTOs:** `*.dto.ts`
- **Entities/Models:** Use Prisma schema
- **Types:** `*.types.ts` or in `types/` directory

---

## Common Tasks

### Adding a New API Endpoint

1. Add route to controller in `apps/api/src/<module>/<module>.controller.ts`
2. Add business logic to `apps/api/src/<module>/<module>.service.ts`
3. Create DTO if needed in `apps/api/src/<module>/dto/`
4. Frontend calls with `/api` prefix

### Adding a New Prisma Model

1. Edit `apps/api/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive-name`
3. Run `npx prisma generate`
4. Create corresponding service/controller

### Creating Frontend API Hooks

```typescript
// Use React Query pattern
import { useQuery, useMutation } from '@tanstack/react-query';

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: () => fetch('/api/integrations').then(r => r.json())
  });
}
```

---

## Troubleshooting

### API Returns 404

- Check route has `/api` prefix in frontend call
- Verify controller decorator matches expected path
- Check NestJS module imports the controller

### Prisma Client Issues

```bash
# Regenerate client
cd apps/api && npx prisma generate

# If schema out of sync
cd apps/api && npx prisma migrate dev
```

### Docker Issues

```bash
# Full rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Port Already in Use

```bash
# Find process
lsof -i :3001

# Kill process
kill -9 <PID>
```

---

## Project Documentation

Key documentation files in the project:

| File | Purpose |
|------|---------|
| `INTEGRATIONS_FRAMEWORK_SPECIFICATION.md` | Feature 01 complete spec |
| `Gateway_Rule_Engine_Complete_Specification.md` | GRE routing rules spec |
| `MASTER_DEVELOPMENT_CHECKLIST.md` | 24-week development tracker |
| `COMPLETE_DEVELOPMENT_PLAN.md` | Detailed implementation guide |
| `Platform_Feature_Roadmap.md` | Feature overview |

---

## Quick Reference

```bash
# Start development
make start
cd apps/api && npm run dev
cd apps/admin-dashboard && npm run dev

# Database changes
cd apps/api && npx prisma migrate dev --name change-description
cd apps/api && npx prisma generate

# Check logs
docker-compose logs -f api

# Reset everything
docker-compose down -v && docker-compose up -d
cd apps/api && npx prisma migrate reset
```

---

*Last Updated: November 27, 2025*
*Feature 01 Backend: Complete | UI: Pending*