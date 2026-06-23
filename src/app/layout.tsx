import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { GithubIcon } from "@/components/GithubIcon";

export const metadata: Metadata = {
  title: "Pi Package Index — unofficial community index",
  description:
    "Unofficial community index of Pi coding-agent packages, ranked by downloads + GitHub stars + maintenance. Not affiliated with earendil-works.",
  metadataBase: new URL("https://pi-package.rectorspace.com"),
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
      "application/feed+json": "/feed.json",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col">
          <nav className="border-b border-neutral-800/60 bg-neutral-950/80">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
              <Link href="/" className="font-mono text-sm font-semibold text-neutral-100">
                pi-package<span className="text-neutral-500">.rectorspace.com</span>
              </Link>
              <div className="flex items-center gap-4 text-sm text-neutral-400">
                <Link href="/" className="hover:text-neutral-100">Packages</Link>
                <Link href="/collections" className="hover:text-neutral-100">Collections</Link>
                <Link href="/compare" className="hover:text-neutral-100">Compare</Link>
                <Link href="/about" className="hover:text-neutral-100">About</Link>
                <a href="/api/packages" className="hover:text-neutral-100">API</a>
                <a
                  href="https://github.com/getpipher/pi-package-index"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub repository"
                  className="hover:text-neutral-100"
                >
                  <GithubIcon size={16} />
                </a>
              </div>
            </div>
          </nav>

          <div className="flex-1">{children}</div>

          <footer className="border-t border-neutral-800/60 px-6 py-6 text-center text-xs text-neutral-600">
            <p>
              Not affiliated with or endorsed by earendil-works. Data sourced from npm and GitHub,
              refreshed daily.
            </p>
            <p className="mt-1">
              <a href="https://pi.dev/packages" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400">
                Official gallery
              </a>{" "}
              ·{" "}
              <a href="https://github.com/getpipher/pi-package-index" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-400">
                Source
              </a>{" "}
              ·{" "}
              <a href="/api/packages" className="hover:text-neutral-400">API</a>{" "}
              ·{" "}
              <a href="/feed.xml" className="hover:text-neutral-400">RSS</a>{" "}
              ·{" "}
              <a href="/feed.json" className="hover:text-neutral-400">JSON Feed</a>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}