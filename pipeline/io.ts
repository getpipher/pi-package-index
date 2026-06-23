// Pipeline-side data readers (Node/tsx context). The Next app reads the index
// via a build-time JSON import in src/lib/data.ts; the pipeline needs a plain
// runtime file read instead.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { IndexData } from "../src/lib/types";

/** Read the generated index from data/packages.json. */
export async function readIndex(dir = "data"): Promise<IndexData> {
  const raw = await readFile(join(dir, "packages.json"), "utf8");
  return JSON.parse(raw) as IndexData;
}