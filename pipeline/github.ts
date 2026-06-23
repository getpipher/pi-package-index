import { readCacheWithTtl, writeCache, safeName, DAY_TTL } from "./npm";

const GITHUB_API = "https://api.github.com";

export interface GitHubRepoData {
  stars: number;
  lastPush: string; // pushed_at ISO
  openIssues: number;
  archived: boolean;
}

export interface ParsedRepo {
  owner: string;
  repo: string;
}

/** Parse a GitHub URL or git SSH string into {owner, repo}. Returns null if not GitHub. */
export function parseGitHubRepo(rawUrl: string | null): ParsedRepo | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();

  const ssh = url.match(/github\.com:([^/]+)\/([^/\s]+?)(?:\.git)?(?:\/|$)/i);
  if (ssh) return { owner: ssh[1]!, repo: ssh[2]! };

  const http = url.match(/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?(?:\/|$)/i);
  if (http) return { owner: http[1]!, repo: http[2]! };

  return null;
}

function token(): string | null {
  return process.env.PI_PKG_GH_PAT || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
}

async function fetchRepoRaw(owner: string, repo: string): Promise<GitHubRepoData | null> {
  const t = token();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "pi-package-index",
  };
  if (t) headers.Authorization = `Bearer ${t}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });
    if (res.ok) {
      const d = (await res.json()) as {
        stargazers_count?: number;
        pushed_at?: string;
        open_issues_count?: number;
        archived?: boolean;
      };
      return {
        stars: d.stargazers_count ?? 0,
        lastPush: d.pushed_at ?? "",
        openIssues: d.open_issues_count ?? 0,
        archived: d.archived ?? false,
      };
    }
    if (res.status === 404) return null;
    if (res.status === 403 || res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") ?? "5");
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, (retryAfter || 5) * 1000));
        continue;
      }
    }
    console.warn(`github: ${res.status} for ${owner}/${repo}`);
    return null;
  }
  return null;
}

const CACHE_DIR = "data/.cache/github";

/** Cached GitHub repo lookup with a daily TTL. `noCache` forces a fresh fetch. */
export async function fetchRepo(parsed: ParsedRepo, noCache = false): Promise<GitHubRepoData | null> {
  const file = `${safeName(`${parsed.owner}/${parsed.repo}`)}.json`;
  if (!noCache) {
    const cached = (await readCacheWithTtl(CACHE_DIR, file, DAY_TTL)) as GitHubRepoData | null;
    if (cached) return cached;
  }
  const data = await fetchRepoRaw(parsed.owner, parsed.repo);
  if (data) await writeCache(CACHE_DIR, file, { ...data, fetchedAt: new Date().toISOString() });
  return data;
}