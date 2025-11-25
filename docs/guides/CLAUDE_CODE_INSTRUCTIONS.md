# Claude Code Instructions

## Payment Platform Development Guidelines

This document provides Claude Code with context and instructions for working with the Payment Platform codebase.

---

## Project Overview

**Payment Platform** is a hierarchical multi-tenant payment orchestration platform designed for agencies managing subscription businesses (primarily coffee subscription companies).

### Core Purpose
- Enable platform owners to manage multiple agency clients
- Allow agencies to manage multiple subscription-based businesses
- Process payments through multiple payment gateways
- Provide subscription management and recurring billing
- Implement behavioral optimization via the Continuity Framework

### Compliance Requirements
- **SOC2**: Service Organization Control 2 compliance
- **PCI-DSS**: Payment Card Industry Data Security Standard
- **ISO 27001**: Information security management

---

## Architecture

### Hierarchical Structure
```
Organization (Platform Owner)
└── Client (Agency)
    └── Company (Subscription Business)
        └── Department
            └── Team
                └── User
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Backend API | NestJS 10 (TypeScript) |
| Database | PostgreSQL with Prisma ORM |
| Frontend Admin | Next.js 14 with Tailwind CSS |
| Queue System | Bull + Redis |
| Authentication | Auth0 + Custom RBAC |
| Build System | Turborepo (monorepo) |
| Containerization | Docker + Docker Compose |

### Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| API | 3001 | NestJS backend |
| Admin Dashboard | 3002 | Next.js admin UI |
| Company Portal | 3003 | Customer-facing portal |
| PostgreSQL | 5432 | Database |
| PgAdmin | 5050 | Database GUI |
| Redis | 6379 | Cache/Queue |
| Redis Commander | 8081 | Redis GUI |

---

## Directory Structure

```
payment-platform/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── app.module.ts   # Root module
│   │   │   ├── main.ts         # Entry point
│   │   │   └── continuity/     # Continuity Framework module
│   │   │       ├── continuity.controller.ts
│   │   │       ├── continuity.service.ts
│   │   │       ├── continuity.module.ts
│   │   │       ├── trust-signal.service.ts
│   │   │       ├── guards/momentum.guard.ts
│   │   │       ├── interceptors/friction.interceptor.ts
│   │   │       ├── interfaces/continuity.interfaces.ts
│   │   │       └── dto/continuity.dto.ts
│   │   └── prisma/
│   │       └── schema.prisma   # Database schema
│   └── admin-dashboard/        # Next.js frontend
│       ├── src/app/
│       │   ├── page.tsx        # Homepage
│       │   ├── layout.tsx      # Root layout
│       │   ├── globals.css     # Global styles
│       │   └── continuity/page.tsx  # Continuity dashboard
│       └── package.json
├── docs/
│   ├── README.md               # Main documentation
│   ├── CONTINUITY_FRAMEWORK.md # Behavioral design docs
│   └── guides/                 # Development guides
├── docker-compose.yml
├── Makefile                    # Development commands
├── package.json                # Root workspace config
├── turbo.json                  # Turborepo config
└── GETTING_STARTED.md          # Quick start guide
```

---

## Key Models & Database Schema

### Primary Entities (Prisma Schema at `apps/api/prisma/schema.prisma`)

#### Hierarchy Models
- **Organization**: Platform owners (avnz.io)
- **Client**: Agencies managing multiple companies
- **Company**: Individual subscription businesses
- **Department**: Functional units within companies
- **Team**: Work groups within departments
- **User**: People with role-based access

#### Customer & Commerce
- **Customer**: End customers of subscription businesses
- **Address**: Shipping and billing addresses with validation
- **Product**: Coffee products with roast levels, origins, flavor notes
- **Order**: Complete orders with address snapshots (immutable after lock)
- **OrderItem**: Individual line items with product snapshots
- **Subscription**: Recurring billing subscriptions

#### Payment (PCI-DSS Compliant)
- **PaymentVault**: Tokenized payment methods (never stores raw card data)
- **PaymentProvider**: Gateway configurations (Payflow, NMI, Stripe, etc.)
- **Transaction**: All payment transactions with full audit trail
- **BillingAccount**: Customer billing preferences

#### Shipping
- **Shipment**: Package shipments with carrier tracking
- **ShipmentEvent**: Tracking events from carriers

#### System
- **ApiKey**: API authentication keys
- **AuditLog**: Complete audit trail with data classification

### Important Enums
- `PaymentProviderType`: PAYFLOW, NMI, AUTHORIZE_NET, STRIPE, BRAINTREE, SQUARE
- `PaymentMethodType`: CARD, ACH, WALLET_APPLE, WALLET_GOOGLE, PAYPAL
- `TransactionType`: CHARGE, REFUND, VOID, CHARGEBACK, AUTHORIZATION, CAPTURE
- `OrderStatus`: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → COMPLETED
- `SubscriptionStatus`: ACTIVE, PAUSED, CANCELED, PAST_DUE, TRIALING

---

## Continuity Framework

The platform implements Chase Hughes' NCI (Non-Verbal Communication Influence) principles for payment optimization.

### Core Principles
1. **Cognitive Continuity**: Consistent mental models, predictable interactions
2. **Behavioral Momentum**: Minimize interruptions during payment flows
3. **Trust Architecture**: Security indicators, social proof, authority signals
4. **Friction Calibration**: Strategic friction based on transaction risk

### Key Components
- `ContinuityService`: Flow state management and optimization
- `TrustSignalService`: Trust indicators and social proof
- `MomentumGuard`: Validates session continuity
- `FrictionInterceptor`: Dynamic friction adjustment

### API Endpoints
```
GET  /api/continuity/config         # Get configuration
PUT  /api/continuity/config         # Update configuration
POST /api/continuity/flow           # Start payment flow
GET  /api/continuity/flow/:id       # Get flow state
POST /api/continuity/friction/calculate  # Calculate friction
GET  /api/continuity/trust-signals  # Get trust signals
GET  /api/continuity/metrics        # Get metrics
```

---

## Development Commands

### Make Commands
```bash
make setup      # Initial project setup
make start      # Start all services
make stop       # Stop all services
make restart    # Restart all services
make logs       # Follow all logs
make logs-api   # Follow API logs only
make status     # Show service status
make clean      # Clean containers and volumes
```

### NPM Scripts
```bash
npm run dev     # Start development (turbo)
npm run build   # Build all packages
npm run test    # Run tests
npm run lint    # Run linting
npm run format  # Format code with Prettier
```

### API-Specific Commands (in apps/api/)
```bash
npm run dev           # Start in watch mode
npm run build         # Build for production
npm run test          # Run unit tests
npm run test:e2e      # Run end-to-end tests
npm run test:cov      # Run with coverage
npm run lint          # Lint and fix
```

---

## Code Conventions

### TypeScript/NestJS Backend

1. **Module Organization**: Follow NestJS module pattern
   - `*.module.ts` - Module definition
   - `*.controller.ts` - HTTP routes
   - `*.service.ts` - Business logic
   - `*.guard.ts` - Route guards
   - `*.interceptor.ts` - Request/response interceptors
   - `*.dto.ts` - Data transfer objects
   - `*.interfaces.ts` - TypeScript interfaces

2. **Naming Conventions**
   - Files: kebab-case (`trust-signal.service.ts`)
   - Classes: PascalCase (`TrustSignalService`)
   - Methods/Variables: camelCase (`calculateFriction`)
   - Constants: SCREAMING_SNAKE_CASE (`DEFAULT_FRICTION_LEVEL`)

3. **Decorators**
   - Use `@Injectable()` for services
   - Use `@Controller()` with route prefix
   - Use `@Get()`, `@Post()`, `@Put()`, `@Delete()` for routes
   - Use `class-validator` decorators for DTO validation

### Next.js Frontend

1. **App Router**: Uses Next.js 14 App Router
2. **Styling**: Tailwind CSS with `@headlessui/react` components
3. **Icons**: `@heroicons/react` for icons

### Prisma

1. **Schema Location**: `apps/api/prisma/schema.prisma`
2. **Model Naming**: PascalCase singular (`Customer`, `Order`)
3. **Table Mapping**: Use `@@map("table_name")` for snake_case tables
4. **Relations**: Always define both sides of relations
5. **Indexes**: Add `@@index()` for frequently queried fields

---

## Security Guidelines

### PCI-DSS Compliance
- **NEVER** store raw card numbers, CVV, or full magnetic stripe data
- Use `PaymentVault` with tokenized gateway references
- Encrypt sensitive data at application level (AES-256-GCM)
- Implement key rotation via `keyVersion` field

### Authentication & Authorization
- Auth0 for identity management
- Custom RBAC based on `ScopeType` and `UserRole`
- API keys with scoped permissions
- JWT validation on protected routes

### Data Protection
- `DataClassification` enum for audit logs (PUBLIC, INTERNAL, CONFIDENTIAL, PII, PCI, PHI)
- Address snapshots for immutable order records
- Complete audit trail via `AuditLog` model

### Input Validation
- Always validate DTOs with `class-validator`
- Sanitize user inputs before database operations
- Use Prisma parameterized queries (SQL injection protection built-in)

---

## Testing Guidelines

### Unit Tests
- Location: Adjacent to source files or in `__tests__` folders
- Use Jest with NestJS testing utilities
- Mock external dependencies (database, payment gateways)

### E2E Tests
- Location: `apps/api/test/`
- Config: `apps/api/test/jest-e2e.json`
- Use supertest for HTTP testing

### Test Commands
```bash
npm run test        # Unit tests
npm run test:watch  # Watch mode
npm run test:cov    # Coverage report
npm run test:e2e    # End-to-end tests
```

---

## Common Tasks

### Adding a New API Endpoint
1. Create/update DTO in `dto/` folder
2. Add method to service
3. Add route to controller
4. Add guards/interceptors as needed
5. Update OpenAPI documentation via decorators

### Adding a New Database Model
1. Add model to `apps/api/prisma/schema.prisma`
2. Add necessary enums
3. Run `npx prisma generate` to update client
4. Create migration with `npx prisma migrate dev`

### Working with Continuity Framework
1. Import `ContinuityModule` in feature modules
2. Use `@MomentumGuard()` on payment endpoints
3. Inject `ContinuityService` for flow management
4. Apply `FrictionInterceptor` to transaction endpoints

### Adding a New Admin Dashboard Page
1. Create page at `apps/admin-dashboard/src/app/[route]/page.tsx`
2. Use existing Tailwind components
3. Fetch data from API endpoints
4. Follow existing patterns for layout and styling

---

## Environment Variables

Reference: `.env.example` in project root

### Required Variables
```
DATABASE_URL=postgresql://user:password@localhost:5432/payment_platform
REDIS_URL=redis://localhost:6379
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

### Payment Providers (configure as needed)
```
PAYFLOW_PARTNER=...
PAYFLOW_VENDOR=...
PAYFLOW_USER=...
PAYFLOW_PASSWORD=...

STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
```

---

## Important Notes for Claude Code

1. **Multi-tenant Awareness**: Always consider the hierarchical structure when querying data. Include appropriate `companyId`, `clientId`, or `organizationId` filters.

2. **Immutable Records**: Order address snapshots and product snapshots are intentionally immutable after certain states. Do not modify these directly.

3. **Payment Security**: Never log, expose, or store sensitive payment data. Always use the `PaymentVault` abstraction.

4. **Continuity Integration**: When building payment flows, integrate with the Continuity Framework for behavioral optimization.

5. **Audit Everything**: Important operations should create `AuditLog` entries with appropriate `DataClassification`.

6. **Test Payment Flows**: Use sandbox/test modes for payment providers during development.

7. **Docker-First Development**: Always use `make start` to ensure consistent development environment.

---

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Continuity Framework](../CONTINUITY_FRAMEWORK.md)
- [Main Documentation](../README.md)
