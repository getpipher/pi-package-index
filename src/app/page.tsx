import { Explorer } from "@/components/Explorer";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Pi Package Index</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">
          Unofficial community index of{" "}
          <a
            href="https://github.com/earendil-works/pi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-300 underline decoration-neutral-700 hover:decoration-neutral-400"
          >
            Pi coding-agent
          </a>{" "}
          packages — ranked by npm downloads, GitHub stars, and maintenance. See the{" "}
          <a
            href="https://pi.dev/packages"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-300 underline decoration-neutral-700 hover:decoration-neutral-400"
          >
            official gallery
          </a>
          .
        </p>
      </header>

      <Explorer />
    </main>
  );
}