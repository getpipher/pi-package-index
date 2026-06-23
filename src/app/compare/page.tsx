import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getIndex } from "@/lib/data";
import { formatNumber, relativeTime } from "@/lib/format";
import { GithubIcon } from "@/components/GithubIcon";
import { CompareAdd } from "@/components/CompareAdd";
import type { Package } from "@/lib/types";

export const metadata: Metadata = {
  title: "Compare — Pi Package Index",
  description: "Side-by-side comparison of Pi packages.",
};

function resolveNames(p: string | string[] | undefined): string[] {
  if (!p) return [];
  return (Array.isArray(p) ? p : [p]).map((n) => decodeURIComponent(n));
}

interface Row {
  label: string;
  render: (pkg: Package) => string;
}

const ROWS: Row[] = [
  { label: "Downloads/mo", render: (p) => formatNumber(p.downloadsMonth) },
  { label: "Stars", render: (p) => (p.stars !== null ? formatNumber(p.stars) : "—") },
  { label: "Last push", render: (p) => relativeTime(p.lastPush) },
  { label: "Published", render: (p) => relativeTime(p.publishedAt) },
  { label: "Open issues", render: (p) => (p.openIssues !== null ? formatNumber(p.openIssues) : "—") },
  { label: "Maintained", render: (p) => (p.maintained ? "yes" : "no") },
  { label: "Types", render: (p) => p.types.join(", ") || "—" },
  { label: "Categories", render: (p) => p.categories.join(", ") || "—" },
  { label: "Version", render: (p) => p.version || "—" },
  { label: "Author", render: (p) => p.author ?? "—" },
];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string | string[] }>;
}) {
  const sp = await searchParams;
  const names = resolveNames(sp.p);
  const all = getIndex().packages;
  const byName = new Map(all.map((p) => [p.name, p] as const));
  const packages = names.map((n) => byName.get(n)).filter((p): p is Package => p !== undefined);
  const missing = names.filter((n) => !byName.has(n));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compare</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Side-by-side comparison of Pi packages. Shareable via the URL (<code className="font-mono text-xs">?p=name&amp;p=name</code>).
          </p>
        </div>
        <Suspense fallback={null}>
          <CompareAdd />
        </Suspense>
      </header>

      {missing.length > 0 && (
        <p className="mb-4 rounded-md border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
          Not in index: {missing.map((m) => <code key={m} className="font-mono text-xs">{m}</code>).reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ", ", el]), [])}
        </p>
      )}

      {packages.length === 0 ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-10 text-center text-sm text-neutral-500">
          Add two or more packages above to compare them.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950/40">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="p-3 text-left text-xs font-medium uppercase text-neutral-500">Metric</th>
                {packages.map((pkg) => (
                  <th key={pkg.name} className="p-3 text-left align-top">
                    <Link href={`/p/${encodeURIComponent(pkg.name)}`} className="font-mono text-sm font-semibold text-neutral-100 hover:text-white">
                      {pkg.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                      <a href={pkg.npmUrl} target="_blank" rel="noopener noreferrer">npm</a>
                      {pkg.repoUrl && (
                        <a href={pkg.repoUrl} target="_blank" rel="noopener noreferrer" aria-label="repo">
                          <GithubIcon size={12} />
                        </a>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-800/60">
                <td className="p-3 text-neutral-500">Description</td>
                {packages.map((pkg) => (
                  <td key={pkg.name} className="max-w-xs p-3 text-neutral-300">{pkg.description || "—"}</td>
                ))}
              </tr>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-neutral-800/60">
                  <td className="p-3 text-neutral-500">{row.label}</td>
                  {packages.map((pkg) => (
                    <td key={pkg.name} className="p-3 text-neutral-200">{row.render(pkg)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="p-3 text-neutral-500">Install</td>
                {packages.map((pkg) => (
                  <td key={pkg.name} className="p-3">
                    <code className="font-mono text-xs text-neutral-300">{pkg.install}</code>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}