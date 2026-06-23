"use client";

import { ExternalLink, GitBranch, Package, Star, Download } from "lucide-react";
import type { Package as Pkg } from "@/lib/types";
import { formatNumber, relativeTime } from "@/lib/format";
import { InstallBar } from "./InstallBar";
import { GithubIcon } from "./GithubIcon";

function TypeBadge({ type }: { type: Pkg["types"][number] }) {
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

function MaintainedBadge() {
  return (
    <span className="rounded border border-emerald-900 bg-emerald-950/50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
      maintained
    </span>
  );
}

function Stat({
  icon,
  value,
  title,
}: {
  icon: React.ReactNode;
  value: string;
  title?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      {icon}
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

export function PackageRow({ pkg }: { pkg: Pkg }) {
  return (
    <li className="border-b border-neutral-800/60 px-4 py-3 transition-colors hover:bg-neutral-900/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={pkg.npmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm font-semibold text-neutral-100 hover:text-white"
            >
              {pkg.name}
            </a>
            {pkg.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
            {pkg.maintained && <MaintainedBadge />}
          </div>

          {pkg.description && (
            <p className="mt-1 line-clamp-2 text-sm text-neutral-400">{pkg.description}</p>
          )}

          {pkg.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {pkg.categories.map((c) => (
                <span key={c} className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] text-neutral-500">
                  {c}
                </span>
              ))}
            </div>
          )}

          <InstallBar install={pkg.install} />
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs text-neutral-400">
          <Stat icon={<Download size={13} />} value={formatNumber(pkg.downloadsMonth)} title={`${pkg.downloadsMonth} downloads/month`} />
          <Stat icon={<Star size={13} />} value={formatNumber(pkg.stars)} title={pkg.stars !== null ? `${pkg.stars} stars` : undefined} />
          <Stat icon={<GitBranch size={13} />} value={relativeTime(pkg.lastPush)} title="last push" />
          <div className="mt-0.5 flex items-center gap-2.5 text-neutral-500">
            {pkg.repoUrl && (
              <a href={pkg.repoUrl} target="_blank" rel="noopener noreferrer" aria-label="Repository" className="hover:text-neutral-200">
                <GithubIcon size={14} />
              </a>
            )}
            <a href={pkg.npmUrl} target="_blank" rel="noopener noreferrer" aria-label="npm" className="hover:text-neutral-200">
              <ExternalLink size={14} />
            </a>
            <span className="hidden items-center gap-1 text-neutral-600 sm:inline-flex">
              <Package size={13} />
              {pkg.author ?? "—"}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}