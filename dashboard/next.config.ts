import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, ".."),
};

const sentryWrapped = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "",
  silent: !process.env.CI,
}) as NextConfig;

// @sentry/nextjs merges `ioredis` into serverExternalPackages for instrumentation.
// BullMQ imports `ioredis/built/utils`; when ioredis is external, Turbopack warns
// because Node cannot resolve that subpath from bullmq's dependency layout.
// Bundling ioredis avoids the "Package ioredis can't be external" warning.
const config: NextConfig = { ...sentryWrapped };
if (Array.isArray(config.serverExternalPackages)) {
  config.serverExternalPackages = config.serverExternalPackages.filter(
    (pkg) => pkg !== "ioredis",
  );
}

export default config;
