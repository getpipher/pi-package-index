import { promises as fs } from "node:fs";
import { join } from "node:path";
import {
  enumeratePackages,
  fetchDownloads,
  pool,
  readCache,
  resolveRepoUrl,
  safeName,
  writeCache,
  type NpmPackageMeta,
} from "./npm";
import { fetchRepo, parseGitHubRepo, type GitHubRepoData, type ParsedRepo } from "./github";
import { buildIndex, buildPackage } from "./normalize";
import type { Enrichment } from "./normalize";
import type { Package } from "../src/lib/types";

const DOWNLOADS_CACHE = "data/.cache/downloads";

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

async function loadSearchCache(): Promise<NpmPackageMeta[] | null> {
  const cached = (await readCache("data/.cache", "npm-search.json")) as
    | { generatedAt: string; packages: NpmPackageMeta[] }
    | null;
  return cached?.packages ?? null;
}

async function saveSearchCache(packages: NpmPackageMeta[]): Promise<void> {
  await writeCache("data/.cache", "npm-search.json", {
    generatedAt: new Date().toISOString(),
    packages,
  });
}

async function cachedDownloads(name: string, noCache: boolean): Promise<number> {
  const file = `${safeName(name)}.json`;
  if (!noCache) {
    const cached = (await readCache(DOWNLOADS_CACHE, file)) as { downloads: number } | null;
    if (cached) return cached.downloads;
  }
  try {
    const downloads = await fetchDownloads(name);
    await writeCache(DOWNLOADS_CACHE, file, { downloads, fetchedAt: new Date().toISOString() });
    return downloads;
  } catch (err) {
    console.warn(`downloads: failed for ${name}: ${(err as Error).message}`);
    return 0;
  }
}

async function cachedGithub(
  meta: NpmPackageMeta,
  noCache: boolean,
): Promise<{ github: GitHubRepoData | null; parsed: ParsedRepo | null }> {
  let parsed = parseGitHubRepo(meta.repoUrl);
  if (!parsed && meta.repoUrl === null) {
    // Search omitted a repo link; try the packument once.
    const resolved = await resolveRepoUrl(meta.name);
    if (resolved) parsed = parseGitHubRepo(resolved);
  }
  if (!parsed) return { github: null, parsed: null };
  void noCache; // cache bypass for github is handled inside fetchRepo's cache layer
  const github = await fetchRepo(parsed);
  return { github, parsed };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(`pi-package-index pipeline — limit=${args.limit ?? "all"} noCache=${args.noCache}`);

  // 1. Enumerate (or load cache).
  let metas = args.noCache ? null : await loadSearchCache();
  if (!metas) {
    console.log("Enumerating npm packages (keywords:pi-package)…");
    metas = await enumeratePackages((n, total) => {
      if (n % 250 === 0 || n === total) console.log(`  enumerated ${n}/${total}`);
    });
    await saveSearchCache(metas);
    console.log(`  saved ${metas.length} packages to search cache.`);
  } else {
    console.log(`  loaded ${metas.length} packages from search cache.`);
  }

  if (args.limit) metas = metas.slice(0, args.limit);
  console.log(`Enriching ${metas.length} packages…`);

  // 2. Downloads (npm downloads API is burst-sensitive — keep concurrency low).
  let done = 0;
  const downloads = await pool(metas, 3, (m) => cachedDownloads(m.name, args.noCache), () => {
    done++;
    if (done % 50 === 0 || done === metas.length) console.log(`  downloads ${done}/${metas.length}`);
  });

  // 3. GitHub (authed token allows higher concurrency).
  done = 0;
  const githubResults = await pool(
    metas,
    8,
    (m) => cachedGithub(m, args.noCache),
    () => {
      done++;
      if (done % 50 === 0 || done === metas.length) console.log(`  github ${done}/${metas.length}`);
    },
  );

  // 4. Assemble.
  const packages: Package[] = metas.map((meta, i) => {
    const { github, parsed } = githubResults[i]!;
    const e: Enrichment = { meta, downloads: downloads[i] ?? 0, github, parsedRepo: parsed };
    return buildPackage(e);
  });

  const index = buildIndex(new Date().toISOString(), packages);

  // 5. Write outputs.
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(join("data", "packages.json"), JSON.stringify(index, null, 2) + "\n");
  await fs.writeFile(join("data", "packages.min.json"), JSON.stringify(index));
  console.log(`Wrote data/packages.json (${packages.length} packages).`);
  const withStars = packages.filter((p) => p.stars !== null).length;
  const maintained = packages.filter((p) => p.maintained).length;
  console.log(`  with stars: ${withStars} · maintained: ${maintained}`);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});