"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Package, ResourceType, SortKey } from "@/lib/types";
import { filterPackages } from "@/lib/filter";
import { Filters } from "./Filters";
import { PackageRow } from "./PackageRow";

interface FilterState {
  q: string;
  types: ResourceType[];
  categories: string[];
  minDownloads: number | null;
  minStars: number | null;
  maintained: boolean;
  sort: SortKey;
}

const DEFAULT_STATE: FilterState = {
  q: "",
  types: [],
  categories: [],
  minDownloads: null,
  minStars: null,
  maintained: false,
  sort: "downloads",
};

const PAGE_SIZE = 100;

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
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.types.length) p.set("types", s.types.join(","));
  if (s.categories.length) p.set("cat", s.categories.join(","));
  if (s.minDownloads !== null) p.set("mindl", String(s.minDownloads));
  if (s.minStars !== null) p.set("minst", String(s.minStars));
  if (s.maintained) p.set("mnt", "1");
  if (s.sort !== "downloads") p.set("sort", s.sort);
  const qs = p.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

export function Explorer({ packages, generatedAt }: { packages: Package[]; generatedAt: string }) {
  const [state, setState] = useState<FilterState>(DEFAULT_STATE);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate filter state from the URL on mount (client-only; window is unavailable during SSR).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- legitimate post-hydration sync from URL */
    setState(readUrlState());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist filter state to the URL after hydration. No setState here.
  useEffect(() => {
    if (hydrated) writeUrlState(state);
  }, [state, hydrated]);

  const filtered = useMemo(
    () =>
      filterPackages(packages, {
        q: state.q,
        types: state.types,
        categories: state.categories,
        minDownloads: state.minDownloads ?? undefined,
        minStars: state.minStars ?? undefined,
        maintained: state.maintained,
        sort: state.sort,
      }),
    [packages, state],
  );

  const shown = filtered.slice(0, visible);

  function update(next: Partial<FilterState>) {
    setState((s) => ({ ...s, ...next }));
    setVisible(PAGE_SIZE); // reset "load more" whenever the filter set changes
  }

  function reset() {
    setState(DEFAULT_STATE);
    setVisible(PAGE_SIZE);
  }

  return (
    <div className="space-y-3">
      <Filters state={state} onChange={update} onReset={reset} total={packages.length} shown={filtered.length} />

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-10 text-center text-sm text-neutral-500">
          No packages match these filters.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-900 rounded-lg border border-neutral-800 bg-neutral-950/40">
          {shown.map((pkg) => (
            <PackageRow key={pkg.name} pkg={pkg} />
          ))}
        </ul>
      )}

      {visible < filtered.length && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-700 hover:text-white"
          >
            Load more <ChevronDown size={15} /> ({filtered.length - visible} remaining)
          </button>
        </div>
      )}

      <p className="px-1 text-xs text-neutral-600">
        Index of {packages.length} packages · refreshed{" "}
        {generatedAt ? new Date(generatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}
      </p>
    </div>
  );
}