"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, AlertCircle } from "lucide-react";
import type { Package, ResourceType, SortKey } from "@/lib/types";
import { filterParams, fetchPackages, type FilterState } from "@/lib/api";
import { Filters } from "./Filters";
import { PackageRow } from "./PackageRow";

const DEFAULT_STATE: FilterState = {
  q: "",
  types: [],
  categories: [],
  minDownloads: null,
  minStars: null,
  maintained: false,
  sort: "downloads",
};

const PER_PAGE = 100;

function readUrlState(): FilterState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const p = new URLSearchParams(window.location.search);
  const types = (p.get("types") ?? "").split(",").filter(Boolean) as ResourceType[];
  const categories = (p.get("cat") ?? "").split(",").filter(Boolean);
  const minDownloads = p.get("mindl");
  const minStars = p.get("minst");
  return {
    q: p.get("q") ?? "",
    types,
    categories,
    minDownloads: minDownloads && minDownloads !== "" ? Number(minDownloads) : null,
    minStars: minStars && minStars !== "" ? Number(minStars) : null,
    maintained: p.get("mnt") === "1",
    sort: (p.get("sort") as SortKey) || "downloads",
  };
}

function writeUrlState(s: FilterState): void {
  if (typeof window === "undefined") return;
  const qs = filterParams(s).toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

export function Explorer() {
  const [state, setState] = useState<FilterState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState<Package[]>([]);
  const [filtered, setFiltered] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const reqId = useRef(0);

  // Hydrate filter state from the URL on mount (client-only).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- legitimate post-hydration sync from URL */
    setState(readUrlState());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist filter state to the URL after hydration.
  useEffect(() => {
    if (hydrated) writeUrlState(state);
  }, [state, hydrated]);

  // Fetch a page. `mode: "replace"` resets the list (filter change, page 1);
  // `mode: "append"` extends it (load more). Race-safe via reqId.
  const fetchPage = useCallback(
    async (p: number, mode: "replace" | "append") => {
      const id = ++reqId.current;
      if (mode === "replace") setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const r = await fetchPackages(state, p, PER_PAGE);
        if (reqId.current !== id) return; // a newer request superseded this one
        setGeneratedAt(r.generatedAt);
        setTotal(r.count);
        setFiltered(r.filtered);
        if (mode === "replace") {
          setItems(r.packages);
          setPage(1);
        } else {
          setItems((prev) => [...prev, ...r.packages]);
          setPage(p);
        }
      } catch (err) {
        if (reqId.current === id) setError((err as Error).message);
      } finally {
        if (reqId.current === id) {
          if (mode === "replace") setLoading(false);
          else setLoadingMore(false);
        }
      }
    },
    [state],
  );

  // Debounced fetch on filter change. The effect body contains no setState;
  // it only schedules the fetchPage callback (which owns all state updates).
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => void fetchPage(1, "replace"), 150);
    return () => clearTimeout(timer);
  }, [state, hydrated, fetchPage]);

  const canLoadMore = !loading && !loadingMore && items.length < filtered;

  async function loadMore() {
    if (loadingMore || !canLoadMore) return;
    await fetchPage(page + 1, "append");
  }

  function update(next: Partial<FilterState>) {
    setState((s) => ({ ...s, ...next }));
  }
  function reset() {
    setState(DEFAULT_STATE);
  }

  const freshness = useMemo(
    () =>
      generatedAt
        ? new Date(generatedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "—",
    [generatedAt],
  );

  return (
    <div className="space-y-3">
      <Filters state={state} onChange={update} onReset={reset} total={total} shown={filtered} />

      {error ? (
        <p className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-6 text-sm text-red-300">
          <AlertCircle size={16} /> Failed to load packages: {error}
        </p>
      ) : loading && items.length === 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-10 text-sm text-neutral-500">
          <Loader2 size={15} className="animate-spin" /> Loading packages…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-10 text-center text-sm text-neutral-500">
          No packages match these filters.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-900 rounded-lg border border-neutral-800 bg-neutral-950/40">
          {items.map((pkg) => (
            <PackageRow key={pkg.name} pkg={pkg} />
          ))}
        </ul>
      )}

      {canLoadMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-700 hover:text-white disabled:opacity-60"
          >
            {loadingMore ? <Loader2 size={15} className="animate-spin" /> : <ChevronDown size={15} />}
            Load more ({filtered - items.length} remaining)
          </button>
        </div>
      )}

      <p className="px-1 text-xs text-neutral-600">
        Index of {total} packages · refreshed {freshness}
      </p>
    </div>
  );
}