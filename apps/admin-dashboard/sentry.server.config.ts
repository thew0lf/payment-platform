// This file configures the initialization of Sentry on the server.
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Filter out health check noise
    beforeSend(event) {
      if (event.request?.url?.includes('/health') ||
          event.request?.url?.includes('/_next/')) {
        return null;
      }
      return event;
    },
  });
}
