"use client";

import { Search, X, FileSearch } from "lucide-react";
import { ALL_CATEGORIES, RESOURCE_TYPES, type ResourceType, type SortKey } from "@/lib/types";

interface FilterState {
  q: string;
  types: ResourceType[];
  categories: string[];
  minDownloads: number | null;
  minStars: number | null;
  maintained: boolean;
  sort: SortKey;
  deep: boolean;
}

interface Props {
  state: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  onReset: () => void;
  total: number;
  shown: number;
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "downloads", label: "Downloads" },
  { key: "stars", label: "Stars" },
  { key: "recent", label: "Recent" },
  { key: "name", label: "Name" },
];

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

export function Filters({ state, onChange, onReset, total, shown }: Props) {
  const anyFilter =
    state.q !== "" ||
    state.types.length > 0 ||
    state.categories.length > 0 ||
    state.minDownloads !== null ||
    state.minStars !== null ||
    state.maintained;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={state.q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Filter packages…"
            aria-label="Search packages"
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 py-1.5 pl-8 pr-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
          />
        </div>

        <select
          value={state.sort}
          onChange={(e) => onChange({ sort: e.target.value as SortKey })}
          aria-label="Sort by"
          className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-200 focus:border-neutral-600 focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Sort: {s.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onChange({ maintained: !state.maintained })}
          className={`rounded-md border px-2 py-1.5 text-sm ${
            state.maintained
              ? "border-emerald-800 bg-emerald-950/50 text-emerald-300"
              : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Maintained only
        </button>

        <button
          type="button"
          onClick={() => onChange({ deep: !state.deep })}
          disabled={state.q.trim() === ""}
          title={state.q.trim() === "" ? "Type a query first to search READMEs" : "Search full README text, not just name/description"}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm ${
            state.deep
              ? "border-sky-800 bg-sky-950/50 text-sky-300"
              : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <FileSearch size={14} /> READMEs
        </button>

        {anyFilter && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-400 hover:text-neutral-200"
          >
            <X size={14} /> Reset
          </button>
        )}

        <span className="ml-auto text-xs text-neutral-500 tabular-nums">
          showing <span className="text-neutral-300">{shown}</span> of {total}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {RESOURCE_TYPES.map((t) => (
          <FilterChip key={t} active={state.types.includes(t)} onClick={() => onChange({ types: toggle(state.types, t) })}>
            {t}
          </FilterChip>
        ))}
        <span className="mx-1 h-4 w-px bg-neutral-800" />
        {ALL_CATEGORIES.map((c) => (
          <FilterChip key={c} active={state.categories.includes(c)} onClick={() => onChange({ categories: toggle(state.categories, c) })}>
            {c}
          </FilterChip>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        <label className="inline-flex items-center gap-1">
          min downloads/mo
          <input
            type="number"
            min={0}
            value={state.minDownloads ?? ""}
            onChange={(e) => onChange({ minDownloads: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
            className="w-24 rounded border border-neutral-800 bg-neutral-900 px-1.5 py-1 text-neutral-300 focus:border-neutral-600 focus:outline-none"
          />
        </label>
        <label className="inline-flex items-center gap-1">
          min stars
          <input
            type="number"
            min={0}
            value={state.minStars ?? ""}
            onChange={(e) => onChange({ minStars: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
            className="w-20 rounded border border-neutral-800 bg-neutral-900 px-1.5 py-1 text-neutral-300 focus:border-neutral-600 focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs capitalize transition-colors ${
        active
          ? "border-neutral-500 bg-neutral-700 text-neutral-100"
          : "border-neutral-800 bg-neutral-900 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300"
      }`}
    >
      {children}
    </button>
  );
}