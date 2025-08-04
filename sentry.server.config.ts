// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === "development",

  // Filter out sensitive information before sending to Sentry
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request) {
      if (event.request.cookies) {
        // Remove all cookies
        delete event.request.cookies;
      }
      if (event.request.headers) {
        // Remove sensitive headers
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
        sensitiveHeaders.forEach(header => {
          if (event.request?.headers) {
            delete event.request.headers[header];
          }
        });
      }
    }

    // Filter out specific errors we don't want to track
    const error = hint.originalException;
    if (error && error instanceof Error) {
      // Ignore ResizeObserver errors (common browser issue)
      if (error.message?.includes('ResizeObserver')) {
        return null;
      }
      // Ignore network errors in development - 테스트를 위해 임시로 비활성화
      // if (process.env.NODE_ENV === "development" && error.message?.includes('fetch')) {
      //   console.error('Development fetch error:', error);
      //   return null;
      // }
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error('Sentry Event:', event);
      console.error('Original Error:', hint.originalException);
    }

    return event;
  },

  // Integrations
  integrations: [
    // Unhandled promise rejections are now captured by default in Sentry
  ],
});
