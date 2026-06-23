// Full-text README search (#4).
//
// Builds a flexsearch Document index once per cold start (module singleton)
// from the bundled packages index + the committed README corpus
// (data/readmes.json, fetched weekly by pipeline/readmes.ts). The corpus is
// a server-only build-time import — it is never shipped to the client.
//
// Ranking: flexsearch returns per-field result groups (name / description /
// readme); we merge them with field weights (name > description > readme) and
// a position decay, then apply the same type/category/maintained filters as
// /api/packages and return full Package objects so the client can reuse
// PackageRow.

import FlexSearch from "flexsearch";
import readmes from "../../data/readmes.json";
import { getIndex } from "./data";
import { deriveMaintained } from "./filter";
import type { Package, ResourceType } from "./types";

type ReadmeMap = Record<string, string>;

interface SearchFilters {
  types?: ResourceType[];
  categories?: string[];
  minDownloads?: number;
  minStars?: number;
  maintained?: boolean;
}

interface SearchResult {
  packages: Package[];
  total: number;
}

const FIELD_WEIGHT: Record<string, number> = {
  name: 10,
  categories: 7,
  description: 5,
  readme: 1,
};

interface FieldGroup {
  field: string;
  result: string[];
}

// flexsearch's bundled typings are loose; treat the Document instance as the
// duck-typed shape we actually use.
type FlexDocument = InstanceType<typeof FlexSearch.Document>;

let singleton: FlexDocument | null = null;

function buildIndex(): FlexDocument {
  const idx = new FlexSearch.Document({
    document: { id: "name", index: [
      { field: "name", tokenize: "forward", resolution: 9 },
      { field: "categories", tokenize: "forward", resolution: 7 },
      { field: "description", tokenize: "forward", resolution: 6 },
      { field: "readme", tokenize: "forward", resolution: 3 },
    ] },
  }) as FlexDocument;
  const map = readmes as ReadmeMap;
  for (const p of getIndex().packages) {
    idx.add({
      name: p.name,
      categories: p.categories.join(" "),
      description: p.description,
      readme: map[p.name] ?? "",
    });
  }
  return idx;
}

function getIndexSearch(): FlexDocument {
  if (!singleton) singleton = buildIndex();
  return singleton;
}

function passesFilters(pkg: Package, f: SearchFilters): boolean {
  if (f.types && f.types.length > 0 && !f.types.some((t) => pkg.types.includes(t))) return false;
  if (f.categories && f.categories.length > 0 && !f.categories.some((c) => pkg.categories.includes(c))) return false;
  if (typeof f.minDownloads === "number" && pkg.downloadsMonth < f.minDownloads) return false;
  if (typeof f.minStars === "number" && (pkg.stars ?? 0) < f.minStars) return false;
  if (f.maintained && !deriveMaintained(pkg)) return false;
  return true;
}

/** Full-text search over name + description + README. Returns ranked packages
 *  (after applying the supplied filters), best match first. */
export function searchPackages(query: string, filters: SearchFilters, limit = 50): SearchResult {
  const q = query.trim();
  if (!q) return { packages: [], total: 0 };

  const idx = getIndexSearch();
  const groups = idx.search(q, { limit: 500 }) as unknown as FieldGroup[];

  // Merge per-field ranked results into a single score per package name.
  const scores = new Map<string, number>();
  for (const g of groups) {
    const weight = FIELD_WEIGHT[g.field] ?? 1;
    const n = g.result.length || 1;
    g.result.forEach((name, i) => {
      // position decay: top of a field's list scores nearly the full weight
      const decay = 1 - i / n;
      scores.set(name, (scores.get(name) ?? 0) + weight * decay);
    });
  }

  const byName = new Map(getIndex().packages.map((p) => [p.name, p] as const));

  const ranked: Array<{ pkg: Package; score: number }> = [];
  for (const [name, score] of scores) {
    const pkg = byName.get(name);
    if (!pkg) continue; // stale corpus vs index (shouldn't happen post-refresh)
    if (!passesFilters(pkg, filters)) continue;
    ranked.push({ pkg, score });
  }
  ranked.sort((a, b) => b.score - a.score || b.pkg.downloadsMonth - a.pkg.downloadsMonth);

  return {
    packages: ranked.slice(0, limit).map((r) => r.pkg),
    total: ranked.length,
  };
}