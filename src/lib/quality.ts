export interface QualitySignals {
  license: string | null;
  installSize: number | null; // bytes
  dependencies: number;
  peerDependencies: number;
  hasTests: boolean;
  piManifestValid: boolean;
  piManifestTypes: string[];
}

interface PackumentLike {
  license?: string | { type?: string };
  files?: string[];
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  dist?: { unpackedSize?: number };
  pi?: { extensions?: unknown[]; skills?: unknown[]; prompts?: unknown[]; themes?: unknown[] };
}

function hasValue(arr: unknown[] | undefined): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

/** Derive lightweight quality signals from an npm packument (no extra network calls). */
export function deriveQuality(p: PackumentLike | null | undefined): QualitySignals | null {
  if (!p) return null;
  const license =
    typeof p.license === "string" ? p.license : p.license?.type ?? null;

  const testFiles = (p.files ?? []).some((f) => /^(__tests__|tests?|test)\b/i.test(f));
  const hasTests = Boolean(p.scripts?.test) || testFiles;

  const pi = p.pi ?? {};
  const piManifestTypes = (["extensions", "skills", "prompts", "themes"] as const).filter(
    (k) => hasValue(pi[k] as unknown[] | undefined),
  );
  const piManifestValid = piManifestTypes.length > 0;

  return {
    license,
    installSize: p.dist?.unpackedSize ?? null,
    dependencies: Object.keys(p.dependencies ?? {}).length,
    peerDependencies: Object.keys(p.peerDependencies ?? {}).length,
    hasTests,
    piManifestValid,
    piManifestTypes,
  };
}

export function formatSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}