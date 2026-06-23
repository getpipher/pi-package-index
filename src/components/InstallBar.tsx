"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function InstallBar({ install }: { install: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(install);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (non-secure context); fail silently.
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="rounded bg-neutral-900 px-2 py-1 font-mono text-xs text-neutral-300">
        $ {install}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy install command"
        className="inline-flex h-6 w-6 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
      >
        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
}