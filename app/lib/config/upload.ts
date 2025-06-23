// app/lib/config/upload.ts
export const R2_CONFIG = {
  ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "mock-account-id",
  ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "mock-access-key",
  SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "mock-secret-key",
  BUCKET_NAME: process.env.R2_BUCKET_NAME || "gym-app-media",
  PUBLIC_DOMAIN: process.env.R2_PUBLIC_DOMAIN || "localhost:3000",
};

export const STREAM_CONFIG = {
  ACCOUNT_ID: process.env.STREAM_ACCOUNT_ID || "mock-stream-account",
  API_TOKEN: process.env.STREAM_API_TOKEN || "mock-stream-token",
};

// 개발 모드 감지
export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
export const USE_MOCK_SERVICES =
  process.env.USE_MOCK_SERVICES === "true" || IS_DEVELOPMENT;

// 업로드 제한 설정
export const UPLOAD_LIMITS = {
  IMAGE: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
  },
  VIDEO: {
    MAX_SIZE: 200 * 1024 * 1024, // 200MB
    MAX_DURATION: 300, // 5분
    ALLOWED_TYPES: ["video/mp4", "video/mov", "video/avi", "video/webm"],
    AUTO_DELETE_DAYS: {
      FREE_USER: 30,
      PAID_USER: null, // 무제한
    },
  },
};
