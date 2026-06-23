import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getCollection, resolveCollectionPackages } from "@/lib/collections";
import { PackageRow } from "@/components/PackageRow";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return { title: "Collection not found — Pi Package Index" };
  return { title: `${collection.title} — Pi Package Index`, description: collection.description };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const packages = resolveCollectionPackages(collection);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/collections" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-300">
        <ArrowLeft size={14} /> All collections
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100">{collection.title}</h1>
        <p className="mt-1 text-sm text-neutral-400">{collection.description}</p>
        <p className="mt-1 text-xs text-neutral-500">
          {packages.length} package{packages.length === 1 ? "" : "s"} · auto-seeded{collection.category ? ` from the “${collection.category}” category` : ""}.
        </p>
      </header>

      {packages.length === 0 ? (
        <p className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-10 text-center text-sm text-neutral-500">
          No packages in this collection yet.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-900 rounded-lg border border-neutral-800 bg-neutral-950/40">
          {packages.map((pkg) => (
            <PackageRow key={pkg.name} pkg={pkg} />
          ))}
        </ul>
      )}
    </main>
  );
}