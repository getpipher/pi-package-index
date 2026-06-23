import type {
  FilterParams,
  Package,
  PaginatedResult,
  SortKey,
} from "./types";

const MAINTAINED_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;

/** Recompute the derived `maintained` flag from lastPush + archived. */
export function deriveMaintained(pkg: Pick<Package, "lastPush" | "archived">): boolean {
  if (pkg.archived === true) return false;
  if (!pkg.lastPush) return false;
  const pushed = Date.parse(pkg.lastPush);
  if (Number.isNaN(pushed)) return false;
  return Date.now() - pushed <= MAINTAINED_WINDOW_MS;
}

function matchesQuery(pkg: Package, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystack = [pkg.name, pkg.description, pkg.author ?? "", ...(pkg.categories ?? [])]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function matchesFilters(pkg: Package, params: FilterParams): boolean {
  if (!matchesQuery(pkg, params.q ?? "")) return false;
  if (params.types && params.types.length > 0) {
    if (!params.types.some((t) => pkg.types.includes(t))) return false;
  }
  if (params.categories && params.categories.length > 0) {
    if (!params.categories.some((c) => pkg.categories.includes(c))) return false;
  }
  if (typeof params.minDownloads === "number" && pkg.downloadsMonth < params.minDownloads) {
    return false;
  }
  if (typeof params.minStars === "number" && (pkg.stars ?? 0) < params.minStars) {
    return false;
  }
  if (params.maintained && !pkg.maintained) return false;
  return true;
}

function sortPackages(packages: Package[], sort: SortKey): Package[] {
  const sorted = [...packages];
  switch (sort) {
    case "stars":
      sorted.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0) || b.downloadsMonth - a.downloadsMonth);
      break;
    case "recent":
      sorted.sort((a, b) => ts(b.publishedAt) - ts(a.publishedAt) || b.downloadsMonth - a.downloadsMonth);
      break;
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "downloads":
    default:
      sorted.sort((a, b) => b.downloadsMonth - a.downloadsMonth || (b.stars ?? 0) - (a.stars ?? 0));
      break;
  }
  return sorted;
}

function ts(iso: string): number {
  const n = Date.parse(iso);
  return Number.isNaN(n) ? 0 : n;
}

export function filterPackages(packages: Package[], params: FilterParams): Package[] {
  const filtered = packages.filter((p) => matchesFilters(p, params));
  return sortPackages(filtered, params.sort ?? "downloads");
}

export function paginate<T>(items: T[], page = 1, perPage = 50): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: safePage,
    perPage,
    total,
    totalPages,
  };
}

/** Clamp perPage for the public API (max 100). */
export function clampPerPage(value: number | undefined, fallback = 50, max = 100): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) return fallback;
  return Math.min(Math.floor(value), max);
}