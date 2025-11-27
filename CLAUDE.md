# Payment Platform - Claude Code Instructions

## Project Structure
- `apps/api` - NestJS backend API (port 3001)
- `apps/admin-dashboard` - Next.js 14 frontend (port 3000)

## API Configuration

**IMPORTANT: The NestJS API has a global prefix `/api` for all routes.**

When creating frontend API calls, all routes must include the `/api` prefix:
- Backend controller: `@Controller('admin/integrations')`
- Frontend must call: `/api/admin/integrations/...`

### API Base URL
- Development: `http://localhost:3001`
- Environment variable: `NEXT_PUBLIC_API_URL`

### Route Examples
| Backend Route | Frontend API Call |
|---------------|-------------------|
| `admin/integrations/platform` | `/api/admin/integrations/platform` |
| `admin/integrations/definitions` | `/api/admin/integrations/definitions` |
| `integrations` | `/api/integrations` |
| `auth/login` | `/api/auth/login` |
| `dashboard/metrics` | `/api/dashboard/metrics` |

## Development Commands
- API: `cd apps/api && npm run dev`
- Dashboard: `cd apps/admin-dashboard && npm run dev`

## Authentication
- JWT-based authentication
- Token stored in localStorage as `avnz_token`
- Include `Authorization: Bearer <token>` header in API requests
