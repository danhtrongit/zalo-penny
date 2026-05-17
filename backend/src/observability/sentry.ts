/**
 * Sentry init — MUST be imported before any other application module so its
 * auto-instrumentation (http, express) can attach to those modules' prototypes.
 *
 * See server.ts: this file is imported at the very top, before app/prisma/etc.
 */
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// We read raw env directly to avoid importing config/env.ts before Sentry boots.
const dsn = process.env.SENTRY_DSN;
const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1");
const profilesSampleRate = Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? "0");
const environment = process.env.NODE_ENV ?? "development";

let initialized = false;

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    integrations: profilesSampleRate > 0 ? [nodeProfilingIntegration()] : [],
    tracesSampleRate,
    profilesSampleRate,
    // Don't send PII unless explicitly opted-in. Pino logger already redacts.
    sendDefaultPii: false,
  });
  initialized = true;
}

export const sentryEnabled = initialized;
export { Sentry };
