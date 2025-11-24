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

## Documentation

- [Architecture Overview](architecture/README.md)
- [API Documentation](api/README.md)
- [Deployment Guide](guides/deployment.md)
