# Billing Portal - Continuity NCI Engineered Reality

## Overview

This is the Billing Portal application, part of the Payment Platform ecosystem. It provides a comprehensive interface for managing invoices, payments, and subscriptions based on Chase Hughes' NCI (Non-Verbal Communication Influence) principles for engineered reality.

## Connection to Payment Platform

The Billing Portal is fully integrated with the Payment Platform API for seamless transaction processing and data management.

### Architecture

```
┌─────────────────────┐
│  Billing Portal     │
│  (Next.js 14)       │
│  Port: 3004         │
└──────────┬──────────┘
           │
           │ HTTP/REST API
           │
┌──────────▼──────────┐
│  Payment Platform   │
│  API (NestJS)       │
│  Port: 3001         │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼───┐    ┌───▼───┐
│  DB   │    │ Redis │
│(5432) │    │(6379) │
└───────┘    └───────┘
```

### API Integration

The portal uses the `PaymentPlatformAPI` client located in `src/lib/api.ts` to communicate with the payment platform:

- **Invoices**: Create, read, update invoice records
- **Payments**: Process payments and track transaction history
- **Subscriptions**: Manage recurring billing subscriptions
- **Health Check**: Monitor API connectivity

### Environment Variables

Configure the connection in your `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

For Docker deployment, this is automatically set in `docker-compose.yml`.

## Getting Started

### Development (Standalone)

```bash
cd apps/billing-portal
npm install
npm run dev
```

Access at: http://localhost:3004

### Development (Docker)

From the project root:

```bash
# Start all services including billing-portal
docker-compose up billing-portal

# Or start all services
docker-compose up
```

Access at: http://localhost:3004

## Features

- **Invoice Management**: View and manage customer invoices
- **Payment Processing**: Process and track payments through the platform
- **Subscription Management**: Handle recurring billing subscriptions
- **Real-time Status**: Live connection status to payment platform
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## Technology Stack

- **Frontend**: Next.js 14, React 18
- **Styling**: Tailwind CSS, HeadlessUI
- **HTTP Client**: Axios
- **TypeScript**: Full type safety
- **API Integration**: RESTful communication with Payment Platform

## Project Structure

```
apps/billing-portal/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout with metadata
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles
│   └── lib/
│       ├── api.ts           # Payment Platform API client
│       └── types.ts         # TypeScript type definitions
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── Dockerfile.dev
```

## API Client Usage

```typescript
import { paymentAPI } from '@/lib/api';

// Get all invoices
const invoices = await paymentAPI.getInvoices({ status: 'pending' });

// Process a payment
const payment = await paymentAPI.processPayment({
  invoiceId: '123',
  amount: 100.00,
  paymentMethod: 'credit_card'
});

// Manage subscriptions
const subscriptions = await paymentAPI.getSubscriptions();
```

## Contributing

This portal is part of the larger Payment Platform monorepo. Ensure all changes are tested with the API integration.

## License

UNLICENSED - Private project
