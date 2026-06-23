import { promises as fs } from "node:fs";
import { join } from "node:path";

const NPM_SEARCH = "https://registry.npmjs.org/-/v1/search";
const NPM_DOWNLOADS = "https://api.npmjs.org/downloads/point/last-month";
const NPM_PACKUMENT = "https://registry.npmjs.org";
const PAGE_SIZE = 250;

export interface NpmPackageMeta {
  name: string;
  description: string;
  author: string | null;
  version: string;
  date: string; // ISO last publish
  npmUrl: string;
  repoUrl: string | null;
}

interface SearchResponse {
  total: number;
  objects: Array<{
    package: {
      name: string;
      description?: string;
      version?: string;
      date?: string;
      author?: string | { name?: string } | null;
      links?: { npm?: string; repository?: string };
    };
  }>;
}

async function fetchJson<T>(url: string, init?: RequestInit, retries = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return (await res.json()) as T;
    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      const retryAfter = Number(res.headers.get("retry-after") ?? "");
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : Math.pow(2, attempt + 1);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    throw new Error(`npm fetch failed: ${res.status} ${res.statusText} for ${url}`);
  }
}

function normalizeAuthor(author: SearchResponse["objects"][number]["package"]["author"]): string | null {
  if (!author) return null;
  if (typeof author === "string") return author;
  return author.name ?? null;
}

/** Enumerate every npm package tagged with the `pi-package` keyword. */
export async function enumeratePackages(onProgress?: (n: number, total: number) => void): Promise<NpmPackageMeta[]> {
  const out: NpmPackageMeta[] = [];
  let from = 0;
  let total = Infinity;
  while (from < total) {
    const url = `${NPM_SEARCH}?text=keywords:pi-package&size=${PAGE_SIZE}&from=${from}`;
    const data = await fetchJson<SearchResponse>(url);
    total = data.total;
    for (const o of data.objects) {
      const p = o.package;
      out.push({
        name: p.name,
        description: p.description ?? "",
        author: normalizeAuthor(p.author),
        version: p.version ?? "",
        date: p.date ?? "",
        npmUrl: p.links?.npm ?? `https://www.npmjs.com/package/${p.name}`,
        repoUrl: p.links?.repository ?? null,
      });
    }
    onProgress?.(out.length, total);
    from += PAGE_SIZE;
    // Polite pacing for the rate-limited search endpoint.
    if (from < total) await new Promise((r) => setTimeout(r, 400));
    // Safety cap against runaway loops.
    if (out.length > 10000) break;
  }
  return out;
}

interface DownloadsResponse {
  downloads: number;
  package: string;
  start: string;
  end: string;
}

/** Fetch last-month download count for a package. */
export async function fetchDownloads(name: string): Promise<number> {
  // Scoped names keep their "/" — the npm downloads API accepts it raw.
  const data = await fetchJson<DownloadsResponse>(`${NPM_DOWNLOADS}/${name}`);
  return data.downloads;
}

interface Packument {
  repository?: string | { url?: string };
}

/** Resolve a repository URL from the packument when search omitted it. */
export async function resolveRepoUrl(name: string): Promise<string | null> {
  try {
    const p = await fetchJson<Packument>(`${NPM_PACKUMENT}/${encodeURIComponent(name).replace("%2F", "/")}`);
    const repo = p.repository;
    if (!repo) return null;
    return typeof repo === "string" ? repo : repo.url ?? null;
  } catch {
    return null;
  }
}

// ---- small concurrency pool ----
export async function pool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  onDone?: (result: R, index: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i]!, i);
      onDone?.(results[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

// ---- disk cache helpers (data/.cache) ----
export function safeName(name: string): string {
  return name.replace(/[^a-z0-9._-]/gi, "_");
}

export async function readCache(dir: string, file: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(join(dir, file), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeCache(dir: string, file: string, data: unknown): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(join(dir, file), JSON.stringify(data));
}