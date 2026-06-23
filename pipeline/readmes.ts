// Weekly README corpus builder for full-text search (#4).
//
// Fetches each package's npm packument, extracts the `readme` field, strips
// HTML, collapses whitespace, truncates to a bounded length, and writes
// data/readmes.json — a flat { [name]: readmeText } map consumed at build
// time by src/lib/search.ts (server-only; never shipped to the client).
//
// Reuses the rate limiter / concurrency pool / disk cache from pipeline/npm.
// Run via `pnpm tsx pipeline/readmes.ts` (or the weekly refresh-search.yml
// cron). Use --no-cache to force a full refetch.

import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  createRateLimiter,
  pool,
  readCacheWithTtl,
  safeName,
  writeCache,
} from "./npm";
import { readIndex } from "./io";

const NPM_PACKUMENT = "https://registry.npmjs.org";
const READMES_CACHE = "data/.cache/readmes";
const OUT_FILE = join("data", "readmes.json");

/** READMEs change slowly — refresh weekly. 7-day TTL lets mid-week reruns
 *  reuse cache; the weekly cron forces a full refetch via --no-cache. */
const WEEK_TTL = 7 * 24 * 60 * 60 * 1000;

/** Bounded excerpt per package — enough for keyword/title matching without
 *  ballooning the committed corpus or the cold-start parse. */
const MAX_README_CHARS = 800;

interface Args {
  limit: number | null;
  noCache: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { limit: null, noCache: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n);
    } else if (a === "--no-cache") {
      args.noCache = true;
    }
  }
  return args;
}

interface Packument {
  readme?: string;
}

interface CachedReadme {
  readme: string;
  fetchedAt: string;
}

async function fetchPackumentReadme(name: string): Promise<string | null> {
  // registry.npmjs.org expects scoped names with the `@` left literal and
  // `/` literal (no percent-encoding of either) in the path.
  const res = await fetch(`${NPM_PACKUMENT}/${name}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Packument;
  const readme = typeof data.readme === "string" ? data.readme.trim() : "";
  return readme || null;
}

/** Reduce a raw README (mixed markdown/HTML) to a compact plain-text excerpt
 *  suitable for tokenized full-text indexing. */
function cleanReadme(raw: string): string {
  let s = raw
    // strip HTML tags
    .replace(/<[^>]+>/g, " ")
    // markdown images: keep alt text, drop the image URL
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // markdown links: keep label text, drop the URL
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // bare URLs (shields.io badges, raw links) — no search value
    .replace(/https?:\/\/\S+/g, " ")
    // decode the handful of entities that show up in npm readme fields
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // collapse all whitespace runs to a single space
    .replace(/\s+/g, " ")
    .trim();
  if (s.length > MAX_README_CHARS) s = s.slice(0, MAX_README_CHARS);
  // Strip lone UTF-16 surrogates (broken emojis / half-cut pairs after
  // slicing) — JSON.stringify emits them as \uDXXX escapes that strict JSON
  // parsers (Turbopack/SWC) reject. Remove after truncation since slicing
  // can itself split a surrogate pair.
  s = s
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
  return s;
}

async function cachedReadme(name: string, noCache: boolean): Promise<string> {
  const file = `${safeName(name)}.json`;
  if (!noCache) {
    const cached = (await readCacheWithTtl(READMES_CACHE, file, WEEK_TTL)) as CachedReadme | null;
    if (cached && typeof cached.readme === "string") return cached.readme;
  }
  try {
    const raw = await fetchPackumentReadme(name);
    const cleaned = raw ? cleanReadme(raw) : "";
    await writeCache(READMES_CACHE, file, { readme: cleaned, fetchedAt: new Date().toISOString() });
    return cleaned;
  } catch (err) {
    console.warn(`readme: failed for ${name}: ${(err as Error).message}`);
    return "";
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(`pi-package-index readmes pipeline — limit=${args.limit ?? "all"} noCache=${args.noCache}`);

  const index = await readIndex();
  let names = index.packages.map((p) => p.name);
  if (args.limit) names = names.slice(0, args.limit);
  console.log(`Fetching READMEs for ${names.length} packages…`);

  // npm registry tolerates reasonable concurrency; cap at ~8/s to be courteous.
  const limiter = createRateLimiter(8);
  let done = 0;
  let withReadme = 0;
  const readmes = await pool(
    names,
    8,
    async (name) => {
      await limiter();
      return cachedReadme(name, args.noCache);
    },
    (readme) => {
      done++;
      if (readme) withReadme++;
      if (done % 250 === 0 || done === names.length) {
        console.log(`  readmes ${done}/${names.length} (with-readme ${withReadme})`);
      }
    },
  );

  const out: Record<string, string> = {};
  for (let i = 0; i < names.length; i++) {
    const r = readmes[i]!;
    if (r) out[names[i]!] = r;
  }

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(out));
  const bytes = (await fs.stat(OUT_FILE)).size;
  console.log(`Wrote ${OUT_FILE} — ${Object.keys(out).length} readmes, ${(bytes / 1024).toFixed(0)} KB.`);
}

main().catch((err) => {
  console.error("Readmes pipeline failed:", err);
  process.exit(1);
});