#!/usr/bin/env node
/**
 * Verification build that does not disturb a running dev server.
 *
 *   npm run build:check
 *
 * `next dev` and `next build` both write to .next. Building while the dev
 * server is up replaces the chunks it is serving, and the running app then
 * fails with "Cannot find module './NNNN.js'" and renders with no CSS — which
 * looks like a stylesheet bug rather than a clobbered build directory.
 *
 * This points the build at .next-verify instead (see distDir in
 * next.config.ts), so it is safe to run at any time. Use `npm run build` for
 * a real production build, with the dev server stopped.
 *
 * Cross-platform without adding a dependency: no shell env-var syntax.
 */

import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'

const OUT_DIR = '.next-verify'

// Stale output from an interrupted run can mask a genuine failure.
rmSync(OUT_DIR, { recursive: true, force: true })

const child = spawn('next', ['build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NEXT_BUILD_DIR: OUT_DIR },
})

child.on('exit', (code) => {
  if (code === 0) {
    console.log(`\nVerification build succeeded. Output in ${OUT_DIR}/ (not served).`)
  }
  process.exit(code ?? 1)
})
