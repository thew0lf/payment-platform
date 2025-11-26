# avnz.io Payment Platform - Modern UI Implementation
## Complete Guide for Claude Code

This document provides step-by-step instructions to implement the modern payment platform UI with role-based access control.

---

## Quick Start for Claude Code

```bash
# In Claude Code, navigate to your project
cd /path/to/payment-platform

# Install new dependencies for admin-dashboard
cd apps/admin-dashboard
npm install @radix-ui/react-dropdown-menu @radix-ui/react-dialog @radix-ui/react-select
npm install @radix-ui/react-tooltip @radix-ui/react-avatar @radix-ui/react-tabs
npm install lucide-react clsx tailwind-merge class-variance-authority
npm install @tanstack/react-query axios date-fns recharts
npm install cmdk zustand
npm install -D @types/node

# Return to root
cd ../..
```

---

## Access Control Matrix

```
┌────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Level          │ Sees Orgs   │ Sees Clients│ Sees Cos    │ Sees Depts  │
├────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ ORGANIZATION   │ ✅ All      │ ✅ All      │ ✅ All      │ ✅ All      │
│ (avnz.io)      │             │             │             │             │
├────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ CLIENT         │ ❌ None     │ ✅ Own only │ ✅ Own only │ ✅ Own only │
│ (Agency)       │             │             │             │             │
├────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ COMPANY        │ ❌ None     │ ❌ None     │ ✅ Own only │ ✅ Own only │
├────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ DEPARTMENT     │ ❌ None     │ ❌ None     │ ❌ None     │ ✅ Own only │
├────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ USER           │ ❌ None     │ ❌ None     │ ❌ None     │ ❌ None     │
└────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## File Structure to Create

```
apps/admin-dashboard/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Dashboard layout with sidebar
│   │   ├── page.tsx                      # Main dashboard
│   │   ├── transactions/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── routing/page.tsx
│   │   ├── payouts/page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   └── team/page.tsx
│   │   └── admin/                        # Org-only routes
│   │       ├── clients/page.tsx
│   │       ├── analytics/page.tsx
│   │       └── system/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── hierarchy/route.ts
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                               # Base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── tabs.tsx
│   │   └── command.tsx
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── command-palette.tsx
│   │   └── breadcrumbs.tsx
│   ├── dashboard/
│   │   ├── metric-card.tsx
│   │   ├── transaction-table.tsx
│   │   ├── provider-status.tsx
│   │   ├── routing-savings.tsx
│   │   └── charts/
│   │       ├── revenue-chart.tsx
│   │       └── transaction-chart.tsx
│   └── hierarchy/
│       ├── client-switcher.tsx
│       ├── company-selector.tsx
│       └── scope-indicator.tsx
├── contexts/
│   ├── auth-context.tsx
│   └── hierarchy-context.tsx
├── hooks/
│   ├── use-auth.ts
│   ├── use-hierarchy.ts
│   └── use-permissions.ts
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── permissions.ts
│   └── utils.ts
└── types/
    ├── auth.ts
    ├── hierarchy.ts
    └── api.ts
```

---

## Implementation Order

1. **Update Tailwind config** - Dark mode + custom colors
2. **Create utility functions** - cn(), permissions helpers
3. **Create types** - TypeScript interfaces
4. **Create base UI components** - Button, Card, Badge, etc.
5. **Create auth context** - With hierarchy awareness
6. **Create layout components** - Sidebar, Header
7. **Create dashboard components** - Metrics, Tables, Charts
8. **Create page routes** - All dashboard pages
9. **Update API endpoints** - Hierarchy-aware queries

---

## Files to Copy

The following files should be created in your project. Copy each file to the specified path.

See the accompanying implementation files:
- `IMPLEMENTATION_01_CONFIG.md` - Tailwind, utils, types
- `IMPLEMENTATION_02_UI.md` - Base UI components
- `IMPLEMENTATION_03_LAYOUT.md` - Sidebar, Header, Layout
- `IMPLEMENTATION_04_CONTEXTS.md` - Auth, Hierarchy contexts
- `IMPLEMENTATION_05_DASHBOARD.md` - Dashboard components
- `IMPLEMENTATION_06_PAGES.md` - All page routes
- `IMPLEMENTATION_07_API.md` - Backend API updates

---

## Testing Access Control

After implementation, test these scenarios:

### Organization User (avnz.io admin)
1. Login → Should see client switcher in sidebar
2. Can switch between all clients
3. Can access /admin/* routes
4. Sees all transactions across all companies

### Client User (Agency admin)
1. Login → Should NOT see client switcher
2. Sees company selector for their companies only
3. Cannot access /admin/* routes (404)
4. Sees only their companies' transactions

### Company User
1. Login → Should NOT see client or company switcher
2. Sees only their company's data
3. Cannot access other companies

---

## Environment Variables

Add to `apps/admin-dashboard/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=your-secret-key-change-in-production

# Auth0 (if using)
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_ISSUER=https://your-domain.auth0.com
```

---

## Next Steps After Implementation

1. Run `make start` to start all services
2. Open http://localhost:3002
3. Test login with different user levels
4. Verify access control works correctly
5. Customize colors/branding as needed
