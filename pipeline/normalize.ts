import type { IndexData, Package, ResourceType } from "../src/lib/types";
import type { NpmPackageMeta } from "./npm";
import type { GitHubRepoData, ParsedRepo } from "./github";
import { detectTypes, tagCategories } from "./categories";

const MAINTAINED_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;

export interface Enrichment {
  meta: NpmPackageMeta;
  downloads: number;
  github: GitHubRepoData | null;
  parsedRepo: ParsedRepo | null;
}

function isMaintained(lastPush: string | null, archived: boolean | null): boolean {
  if (archived === true) return false;
  if (!lastPush) return false;
  const pushed = Date.parse(lastPush);
  if (Number.isNaN(pushed)) return false;
  return Date.now() - pushed <= MAINTAINED_WINDOW_MS;
}

export function buildPackage(e: Enrichment): Package {
  const types: ResourceType[] = detectTypes(e.meta.name, e.meta.description);
  const categories = tagCategories(e.meta.name, e.meta.description);
  const repoUrl = e.parsedRepo
    ? `https://github.com/${e.parsedRepo.owner}/${e.parsedRepo.repo}`
    : e.meta.repoUrl;
  return {
    name: e.meta.name,
    description: e.meta.description,
    author: e.meta.author,
    types,
    categories,
    npmUrl: e.meta.npmUrl,
    repoUrl: repoUrl ?? null,
    repoOwner: e.parsedRepo?.owner ?? null,
    repoName: e.parsedRepo?.repo ?? null,
    version: e.meta.version,
    publishedAt: e.meta.date,
    downloadsMonth: e.downloads,
    stars: e.github?.stars ?? null,
    lastPush: e.github?.lastPush ?? null,
    openIssues: e.github?.openIssues ?? null,
    archived: e.github?.archived ?? null,
    maintained: isMaintained(e.github?.lastPush ?? null, e.github?.archived ?? null),
    install: `pi install npm:${e.meta.name}`,
  };
}

export function buildIndex(generatedAt: string, packages: Package[]): IndexData {
  return {
    generatedAt,
    count: packages.length,
    packages,
  };
}