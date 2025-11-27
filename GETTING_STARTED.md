# Getting Started

## Prerequisites

- macOS (this setup is optimized for Mac)
- Docker Desktop
- Node.js 18+
- Git

## Quick Setup

1. **Download and run the setup script**:
```bash
   curl -fsSL [setup-script-url] | bash
```

2. **Or manual setup**:
```bash
   git clone [your-repo-url]
   cd payment-platform
   make setup
```

3. **Configure local hosts** (add to `/etc/hosts`):
```
127.0.0.1   dev.avnz.io
127.0.0.1   api.dev.avnz.io
127.0.0.1   admin.dev.avnz.io
127.0.0.1   portal.dev.avnz.io
```

4. **Start development**:
```bash
   make start
```

5. **Open the applications**:
   - Admin Dashboard: http://admin.dev.avnz.io:3002
   - API Server: http://api.dev.avnz.io:3001
   - Main App: http://dev.avnz.io:3000
   - Company Portal: http://portal.dev.avnz.io:3003

## Development URLs

| Application       | URL                              | Port |
|-------------------|----------------------------------|------|
| Main App          | http://dev.avnz.io:3000          | 3000 |
| API Server        | http://api.dev.avnz.io:3001      | 3001 |
| Admin Dashboard   | http://admin.dev.avnz.io:3002    | 3002 |
| Company Portal    | http://portal.dev.avnz.io:3003   | 3003 |

## What's Included

- Complete Docker development environment
- PostgreSQL database with PgAdmin
- Redis with Redis Commander
- Nest.js API server
- Next.js admin dashboard
- Next.js company portal
- Auth0 SSO authentication (with local JWT fallback)
- OAuth integration support (Google, Microsoft, Slack, etc.)
- Development tools and scripts

## Authentication

The platform supports two authentication methods:

### Option 1: Auth0 SSO (Recommended for Production)
1. Create an Auth0 tenant at https://auth0.com
2. Create a Single Page Application
3. Configure your `.env`:
```
AUTH0_ENABLED=true
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_AUDIENCE=https://api.avnz.io
```
4. In Auth0 Dashboard, add allowed callback URLs:
   - `http://dev.avnz.io:3000`
   - `http://admin.dev.avnz.io:3002`
5. Add allowed logout URLs:
   - `http://dev.avnz.io:3000/login`
   - `http://admin.dev.avnz.io:3002/login`

### Option 2: Local JWT Authentication (Development)
By default (`AUTH0_ENABLED=false`), the platform uses local JWT authentication.

**Demo Accounts** (password: `demo123`):
| Level        | Email                      |
|--------------|----------------------------|
| Organization | admin@avnz.io              |
| Client       | owner@velocityagency.com   |
| Company      | manager@coffee-co.com      |

## Next Steps

1. Configure your payment provider credentials in `.env`
2. Set up Auth0 or use local authentication for development
3. Set up OAuth provider credentials for integrations
4. Start building your first features!

## Support

- Read the [full documentation](docs/README.md)
- Check [troubleshooting guide](docs/guides/troubleshooting.md)
- Review [architecture decisions](docs/conversations/)
