/**
 * Prisma configuration file (Prisma 6.6+ / Prisma 7 ready).
 *
 * Replaces the deprecated `package.json#prisma` block:
 *   "prisma": { "seed": "tsx prisma/seed.ts" }
 *
 * Once this file is confirmed working, remove that block from package.json.
 *
 * Docs: https://pris.ly/prisma-config
 */

// When prisma.config.ts is present, Prisma stops auto-loading .env files —
// we load them ourselves so DATABASE_URL etc. resolve.
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

// `prisma/config` is available in Prisma ≥ 6.6 with earlyAccess flag,
// and becomes the default import path in Prisma 7.
// @ts-ignore — module exists at runtime; TS types depend on installed version
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Note: `migrate.seed` is a Prisma 7 feature — not yet in Prisma 6 types.
  // Seed config stays in package.json#prisma until Prisma 7 is released.
})
