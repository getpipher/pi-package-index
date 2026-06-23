import type { NextConfig } from "next";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Make the generated index downloadable as static assets. Runs on every
// `next build` (Vercel's Next preset calls `next build` directly, which would
// otherwise skip the npm `prebuild` lifecycle hook).
const root = process.cwd();
mkdirSync(join(root, "public", "data"), { recursive: true });
for (const file of ["packages.json", "packages.min.json"]) {
  const src = join(root, "data", file);
  if (!existsSync(src)) continue;
  try {
    cpSync(src, join(root, "public", "data", file));
  } catch (err) {
    console.warn(`[next.config] failed to copy data/${file}: ${(err as Error).message}`);
  }
}

const config: NextConfig = {
  reactStrictMode: true,
};

export default config;