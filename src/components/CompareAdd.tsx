"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

/** Adds a package name to the current compare set via the URL. */
export function CompareAdd() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    const next = new URLSearchParams(params.toString());
    next.append("p", name);
    router.push(`/compare?${next.toString()}`);
    setValue("");
  }

  return (
    <form onSubmit={add} className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a package name…"
        aria-label="Add package to compare"
        className="w-64 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
      />
      <button
        type="submit"
        className="inline-flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-700 hover:text-white"
      >
        <Plus size={15} /> Add
      </button>
    </form>
  );
}