// Sentry instrumentation - must be imported before anything else
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Profiling (requires @sentry/profiling-node)
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      nodeProfilingIntegration(),
    ],

    // Filter out health check noise
    beforeSend(event) {
      // Don't send health check errors
      if (event.request?.url?.includes('/health')) {
        return null;
      }
      return event;
    },

    // Set release version if available
    release: process.env.npm_package_version || 'unknown',
  });

  console.log('Sentry initialized for error monitoring');
}

export { Sentry };
