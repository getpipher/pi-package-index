import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download, Star, GitBranch, GitFork, AlertTriangle, Archive } from "lucide-react";
import { getIndex } from "@/lib/data";
import { formatNumber, relativeTime } from "@/lib/format";
import { InstallBar } from "@/components/InstallBar";
import { GithubIcon } from "@/components/GithubIcon";
import { Readme } from "@/components/Readme";
import type { Package, ResourceType } from "@/lib/types";

interface Packument {
  readme?: string;
}

async function fetchReadme(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${name}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Packument;
    return typeof data.readme === "string" && data.readme.trim() ? data.readme : null;
  } catch {
    return null;
  }
}

function TypeBadge({ type }: { type: ResourceType }) {
  const colors: Record<string, string> = {
    extension: "bg-sky-950/60 text-sky-300 border-sky-900",
    skill: "bg-violet-950/60 text-violet-300 border-violet-900",
    prompt: "bg-amber-950/60 text-amber-300 border-amber-900",
    theme: "bg-pink-950/60 text-pink-300 border-pink-900",
  };
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${colors[type] ?? "border-neutral-800 text-neutral-400"}`}>
      {type}
    </span>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-neutral-500">{icon}{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-100">{value}</div>
    </div>
  );
}

// Single-segment route; the package name (incl. scoped `/`) is URL-encoded by callers.
async function resolveName(params: { name: string }): Promise<string> {
  return decodeURIComponent(params.name);
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const pkgName = await resolveName({ name });
  const pkg = getIndex().packages.find((p) => p.name === pkgName);
  if (!pkg) return { title: "Package not found — Pi Package Index" };
  return {
    title: `${pkg.name} — Pi Package Index`,
    description: pkg.description || `Pi package ${pkg.name}`,
    metadataBase: new URL("https://pi-package.rectorspace.com"),
  };
}

export default async function PackageDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const pkgName = await resolveName({ name });
  const pkg = getIndex().packages.find((p) => p.name === pkgName) as Package | undefined;
  if (!pkg) notFound();

  const readme = await fetchReadme(pkg.name);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-300">
        <ArrowLeft size={14} /> All packages
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-2xl font-bold text-neutral-100">{pkg.name}</h1>
          {pkg.types.map((t) => <TypeBadge key={t} type={t} />)}
          {pkg.maintained && (
            <span className="rounded border border-emerald-900 bg-emerald-950/50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              maintained
            </span>
          )}
          {pkg.archived === true && (
            <span className="inline-flex items-center gap-1 rounded border border-red-900 bg-red-950/50 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
              <Archive size={10} /> archived
            </span>
          )}
        </div>
        {pkg.description && <p className="mt-2 text-neutral-300">{pkg.description}</p>}
        <p className="mt-1 text-xs text-neutral-500">
          by {pkg.author ?? "—"} · v{pkg.version || "?"} · published {relativeTime(pkg.publishedAt)}
        </p>
      </header>

      <div className="mt-4"><InstallBar install={pkg.install} /></div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={<Download size={13} />} label="downloads/mo" value={formatNumber(pkg.downloadsMonth)} />
        <Stat icon={<Star size={13} />} label="stars" value={pkg.stars !== null ? formatNumber(pkg.stars) : "—"} />
        <Stat icon={<GitBranch size={13} />} label="last push" value={relativeTime(pkg.lastPush)} />
        <Stat icon={<GitFork size={13} />} label="open issues" value={pkg.openIssues !== null ? formatNumber(pkg.openIssues) : "—"} />
      </div>

      {pkg.categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {pkg.categories.map((c) => (
            <Link
              key={c}
              href={`/?cat=${c}`}
              className="rounded bg-neutral-900 px-2 py-0.5 text-xs capitalize text-neutral-400 hover:text-neutral-200"
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-sm text-neutral-400">
        <a href={pkg.npmUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-neutral-200">npm ↗</a>
        {pkg.repoUrl && (
          <a href={pkg.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-neutral-200">
            <GithubIcon size={14} /> repo ↗
          </a>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-neutral-200">README</h2>
        {readme ? (
          <Readme source={readme} />
        ) : (
          <p className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-6 text-sm text-neutral-500">
            <AlertTriangle size={15} /> No README available.
            <a href={pkg.npmUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-300">View on npm</a>
            {pkg.repoUrl && <> or <a href={pkg.repoUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-300">the repo</a>.</>}
          </p>
        )}
      </section>
    </main>
  );
}