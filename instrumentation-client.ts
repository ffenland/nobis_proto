// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content for privacy
      maskAllText: true,
      // Block all media elements
      blockAllMedia: true,
      // Mask all inputs
      maskAllInputs: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.5,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === "development",

  // Filter out sensitive information before sending to Sentry
  beforeSend(event, hint) {
    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        // Filter out sensitive form data
        if (breadcrumb.category === 'ui.input' && breadcrumb.message) {
          // Check if it's a password or sensitive field
          if (breadcrumb.message.includes('password') || 
              breadcrumb.message.includes('token') ||
              breadcrumb.message.includes('secret')) {
            breadcrumb.data = { masked: true };
          }
        }
        return breadcrumb;
      });
    }

    // Filter out specific errors we don't want to track
    const error = hint.originalException;
    if (error && error instanceof Error) {
      // Ignore ResizeObserver errors (common browser issue)
      if (error.message?.includes('ResizeObserver')) {
        return null;
      }
      
      // Ignore Script loading errors from third-party domains
      if (error.message?.includes('Script error')) {
        return null;
      }

      // Ignore common browser extension errors
      if (error.message?.includes('extension://')) {
        return null;
      }
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error('Sentry Client Event:', event);
      console.error('Original Error:', hint.originalException);
    }

    return event;
  },

  // Session tracking is enabled by default in Sentry SDK
  
  // Only send errors from our domain
  allowUrls: [
    /^https?:\/\/localhost(:\d+)?/,  // localhost with any port
    /^https?:\/\/127\.0\.0\.1(:\d+)?/,  // 127.0.0.1 with any port  
    /^https?:\/\/nobis.*\.vercel\.app/,
    // 프로덕션 도메인 추가 필요
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;