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

3. **Start development**:
```bash
   make start
```

4. **Open the admin dashboard**:
   http://localhost:3002

## What's Included

- ✅ Complete Docker development environment
- ✅ PostgreSQL database with PgAdmin
- ✅ Redis with Redis Commander
- ✅ Nest.js API server
- ✅ Next.js admin dashboard
- ✅ Development tools and scripts

## Next Steps

1. Configure your payment provider credentials in `.env`
2. Set up Auth0 for authentication
3. Start building your first features!

## Support

- Read the [full documentation](docs/README.md)
- Check [troubleshooting guide](docs/guides/troubleshooting.md)
- Review [architecture decisions](docs/conversations/)
