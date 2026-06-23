// Copies generated index data into public/data/ so it is downloadable as static assets.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const outDir = join(root, "public", "data");
mkdirSync(outDir, { recursive: true });

for (const file of ["packages.json", "packages.min.json"]) {
  const src = join(root, "data", file);
  if (!existsSync(src)) {
    console.warn(`[copy-data] source missing: data/${file} — skipping`);
    continue;
  }
  const dest = join(outDir, file);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[copy-data] data/${file} -> public/data/${file}`);
}