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
- OAuth integration support (Google, Microsoft, Slack, etc.)
- Development tools and scripts

## Next Steps

1. Configure your payment provider credentials in `.env`
2. Set up OAuth provider credentials for integrations
3. Start building your first features!

## Support

- Read the [full documentation](docs/README.md)
- Check [troubleshooting guide](docs/guides/troubleshooting.md)
- Review [architecture decisions](docs/conversations/)
