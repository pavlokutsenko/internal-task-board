import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const createNextConfig = (phase: string): NextConfig => ({
  reactStrictMode: true,
  // Keep dev and prod build artifacts separate to avoid corrupting dev chunks
  // when running `next build` while `next dev` is active.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next" : ".next-prod",
});

export default createNextConfig;
