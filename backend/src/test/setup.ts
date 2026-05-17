// Test-only env defaults — set BEFORE any module imports `../config/env`.
// Vitest loads this file via vitest.config.ts setupFiles or by direct import
// in test files when needed.
process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-min-16-chars";
process.env.YESCALE_API_KEY = process.env.YESCALE_API_KEY ?? "test-yescale-key";
process.env.SEPAY_MERCHANT_ID = process.env.SEPAY_MERCHANT_ID ?? "TEST-MERCHANT";
process.env.SEPAY_SECRET_KEY = process.env.SEPAY_SECRET_KEY ?? "test-sepay-secret";
process.env.ZALO_BOT_MODE = process.env.ZALO_BOT_MODE ?? "polling";
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "silent";

export {};
