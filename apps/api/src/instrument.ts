// Sentry instrumentation stub
// Note: @sentry/nestjs is not installed, so this is a no-op stub
// Install @sentry/nestjs and @sentry/profiling-node to enable Sentry monitoring

const SENTRY_DSN = process.env.SENTRY_DSN;

// Create a stub Sentry object that does nothing
const SentryStub = {
  init: (..._args: unknown[]) => {},
  captureException: (..._args: unknown[]) => {},
  captureMessage: (..._args: unknown[]) => {},
  setUser: (..._args: unknown[]) => {},
  setTag: (..._args: unknown[]) => {},
  setExtra: (..._args: unknown[]) => {},
  addBreadcrumb: (..._args: unknown[]) => {},
  startSpan: (..._args: unknown[]) => {},
  withScope: (callback: (scope: unknown) => void) => callback({}),
};

// Export the stub
export const Sentry = SentryStub;

if (SENTRY_DSN) {
  console.log('Sentry DSN configured but @sentry/nestjs not installed - error monitoring disabled');
}
