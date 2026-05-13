/**
 * Re-exports `next/server` under the `.js` extension alias.
 *
 * Next.js auto-generates `.next/types/**` files with
 *   import type { NextRequest } from 'next/server.js'
 * which TypeScript (moduleResolution: "bundler") can't resolve on its own
 * because Next.js doesn't expose a `./server.js` exports entry with types.
 * This shim satisfies the import without changing any build settings.
 */
declare module 'next/server.js' {
  export * from 'next/server'
}
