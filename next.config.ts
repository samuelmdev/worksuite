import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /*
   * `next dev` and `next build` both write to .next by default, so running a
   * build while the dev server is up replaces the chunks the dev server is
   * serving. The running app then 500s with "Cannot find module './NNNN.js'"
   * and loses its CSS, which looks like a broken stylesheet rather than a
   * clobbered build directory.
   *
   * `npm run build:check` sets NEXT_BUILD_DIR so a verification build lands
   * somewhere else and leaves the dev server alone.
   */
  distDir: process.env.NEXT_BUILD_DIR || ".next",
}

export default nextConfig
