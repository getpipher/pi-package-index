import Link from "next/link";
import { GithubIcon } from "@/components/GithubIcon";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">About</h1>

      <section className="mt-6 space-y-3 text-sm leading-relaxed text-neutral-300">
        <p>
          <strong className="text-neutral-100">Pi Package Index</strong> is an unofficial community
          index of packages for the{" "}
          <a
            href="https://github.com/earendil-works/pi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-100 underline decoration-neutral-700 hover:decoration-neutral-400"
          >
            Pi coding agent
          </a>
          . It ranks packages by npm downloads, GitHub stars, and maintenance health, with
          filterable search and a public JSON API.
        </p>
        <p className="text-neutral-400">
          Not affiliated with or endorsed by earendil-works. See the{" "}
          <a
            href="https://pi.dev/packages"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-300 underline decoration-neutral-700 hover:decoration-neutral-400"
          >
            official gallery
          </a>{" "}
          for the canonical package catalog.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-100">Data sources</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-neutral-400">
          <li>
            <span className="text-neutral-300">npm registry</span> — packages tagged with the{" "}
            <code className="rounded bg-neutral-900 px-1 py-0.5 font-mono text-xs text-neutral-300">pi-package</code>{" "}
            keyword.
          </li>
          <li>
            <span className="text-neutral-300">npm downloads API</span> — last-month download counts.
          </li>
          <li>
            <span className="text-neutral-300">GitHub REST API</span> — stars, last push, open issues,
            archived flag.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-100">Refresh cadence</h2>
        <p className="mt-3 text-sm text-neutral-400">
          The index is regenerated daily at 04:00 UTC by a GitHub Actions cron that commits{" "}
          <code className="rounded bg-neutral-900 px-1 py-0.5 font-mono text-xs text-neutral-300">data/packages.json</code>{" "}
          and triggers a redeploy. The <code className="font-mono text-xs">generatedAt</code> field in
          every API response records the index age.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-100">Get your package listed</h2>
        <p className="mt-3 text-sm text-neutral-400">
          Publish to npm with the <code className="font-mono text-xs text-neutral-300">pi-package</code>{" "}
          keyword in your <code className="font-mono text-xs text-neutral-300">package.json</code>. It
          appears here on the next refresh. See the{" "}
          <a
            href="https://github.com/earendil-works/pi/blob/main/docs/packages.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-300 underline decoration-neutral-700 hover:decoration-neutral-400"
          >
            Pi package docs
          </a>
          .
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-100">Public API</h2>
        <p className="mt-3 text-sm text-neutral-400">
          <Link href="/api/packages" className="text-neutral-300 underline decoration-neutral-700 hover:decoration-neutral-400">
            /api/packages
          </Link>{" "}
          — filterable, paginated JSON (max 100 per page). CORS-enabled.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
{`# top MCP packages with >=10 stars, sorted by stars
curl "https://pi-package.rectorspace.com/api/packages?cat=mcp&minStars=10&sort=stars&perPage=10"

# bulk download (full index)
curl https://pi-package.rectorspace.com/data/packages.min.json`}
        </pre>
        <p className="mt-3 text-xs text-neutral-600">
          Query params: <code className="font-mono">q</code>,{" "}
          <code className="font-mono">types</code> (csv),{" "}
          <code className="font-mono">cat</code> (csv),{" "}
          <code className="font-mono">mindl</code>,{" "}
          <code className="font-mono">minst</code>,{" "}
          <code className="font-mono">mnt=1</code>,{" "}
          <code className="font-mono">sort</code>,{" "}
          <code className="font-mono">page</code>,{" "}
          <code className="font-mono">perPage</code>.
        </p>
      </section>

      <section className="mt-10 flex items-center gap-3 text-sm text-neutral-500">
        <a
          href="https://github.com/getpipher/pi-package-index"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-neutral-200"
        >
          <GithubIcon size={15} /> Source
        </a>
        <span>·</span>
        <Link href="/" className="hover:text-neutral-200">Packages</Link>
        <span>·</span>
        <Link href="/api/packages" className="hover:text-neutral-200">API</Link>
      </section>
    </main>
  );
}