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

## Responsive Design Requirements

The application must be responsive across all device sizes:

| Breakpoint | Width | Target Devices |
|------------|-------|----------------|
| Mobile | < 640px (sm) | Phones |
| Tablet | 640px - 1024px (md/lg) | Tablets, small laptops |
| Desktop | > 1024px (xl) | Laptops, monitors |
| Large | > 1280px (2xl) | Presentations, large displays |

### Mobile Navigation Pattern
- **Sidebar**: Hidden on mobile (`hidden md:block`), uses drawer component
- **Mobile Menu**: Context-based (`MobileMenuProvider` in layout)
- **Hamburger**: Visible only on mobile (`md:hidden`)
- **Header**: Uses `useMobileMenu()` hook to trigger drawer

### Responsive Guidelines
1. **Touch targets**: Minimum 44px for interactive elements on mobile
2. **Padding**: Use `px-4 md:px-6` pattern for consistent spacing
3. **Typography**: Scale down headings on mobile (`text-xl md:text-2xl`)
4. **Grids**: Use responsive columns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
5. **Actions**: Stack buttons on mobile (`flex-col sm:flex-row`)

### Key Layout Components
- `apps/admin-dashboard/src/components/layout/sidebar.tsx` - Desktop sidebar
- `apps/admin-dashboard/src/components/layout/mobile-sidebar.tsx` - Mobile drawer
- `apps/admin-dashboard/src/components/layout/header.tsx` - Responsive header
- `apps/admin-dashboard/src/contexts/mobile-menu-context.tsx` - Mobile menu state

## Integration Icons

Integration provider icons are stored in `apps/admin-dashboard/public/integrations/` as SVG files with brand colors. The `providerConfig` mapping in integration components provides:
- `iconUrl`: Path to SVG icon
- `bgColor`: Tailwind background class
- `gradient`: Gradient classes for fallback
