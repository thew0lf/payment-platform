# Payment Platform - Claude Code Instructions

## Project Structure

```
payment-platform/
├── apps/
│   ├── api/                 # NestJS backend (port 3001)
│   └── admin-dashboard/     # Next.js 14 frontend (port 3000)
├── docs/roadmap/            # Development plans and specs
└── prisma/                  # Database schema (in apps/api)
```

## Development Commands

```bash
# Start API server
cd apps/api && npm run dev

# Start Dashboard
cd apps/admin-dashboard && npm run dev

# Database
cd apps/api && npx prisma migrate dev
cd apps/api && npx prisma db seed
```

## API Configuration

**IMPORTANT: All API routes require the `/api` prefix.**

The NestJS API uses a global prefix. When creating frontend API calls:

| Backend Controller | Frontend API Call |
|-------------------|-------------------|
| `@Controller('auth')` | `/api/auth/...` |
| `@Controller('admin/integrations')` | `/api/admin/integrations/...` |
| `@Controller('integrations')` | `/api/integrations/...` |
| `@Controller('dashboard')` | `/api/dashboard/...` |

### Environment Variables

```bash
# Frontend (apps/admin-dashboard/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend (apps/api/.env.local)
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret"
```

## Authentication

- JWT-based authentication
- Token stored in localStorage: `avnz_token`
- Header format: `Authorization: Bearer <token>`

## Key Patterns

### Frontend API Client
API clients are in `apps/admin-dashboard/src/lib/api/`. Each module exports typed functions that call the backend.

### Backend Module Structure
```
apps/api/src/<module>/
├── <module>.module.ts       # NestJS module
├── <module>.controller.ts   # Route handlers
├── services/                # Business logic
└── types/                   # TypeScript types
```
