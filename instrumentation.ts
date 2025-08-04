import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// 클라이언트 사이드 초기화 추가
if (typeof window !== 'undefined') {
  import('./instrumentation-client');
}

export const onRequestError = Sentry.captureRequestError;
