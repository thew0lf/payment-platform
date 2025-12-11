// This file configures the initialization of Sentry on the client.
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance monitoring - sample rate for production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Filter out noisy errors
    beforeSend(event) {
      // Don't send errors from browser extensions
      if (event.exception?.values?.[0]?.stacktrace?.frames?.some(
        frame => frame.filename?.includes('extensions')
      )) {
        return null;
      }
      return event;
    },
  });
}
