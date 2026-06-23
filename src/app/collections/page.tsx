import Link from "next/link";
import type { Metadata } from "next";
import { getCollections, resolveCollectionPackages } from "@/lib/collections";

export const metadata: Metadata = {
  title: "Collections — Pi Package Index",
  description: "Curated collections of Pi coding-agent packages by category.",
};

export default function CollectionsPage() {
  const collections = getCollections();
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Curated groupings of Pi packages by use-case. Auto-seeded from the index by category;
          hand-picked lists can be added to <code className="font-mono text-xs">data/collections.json</code>.
        </p>
      </header>

      <ul className="space-y-3">
        {collections.map((c) => {
          const count = resolveCollectionPackages(c).length;
          return (
            <li key={c.slug}>
              <Link
                href={`/collections/${c.slug}`}
                className="block rounded-lg border border-neutral-800 bg-neutral-950/40 p-4 transition-colors hover:border-neutral-700"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold text-neutral-100">{c.title}</h2>
                  <span className="text-xs text-neutral-500 tabular-nums">{count} packages</span>
                </div>
                <p className="mt-1 text-sm text-neutral-400">{c.description}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}