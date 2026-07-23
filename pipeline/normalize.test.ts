import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex } from "./normalize";
import type { Package } from "../src/lib/types";

function pkg(name: string): Package {
  // buildIndex only reads `name` for dedup; construct a minimal Package.
  return {
    name,
    description: "",
    author: null,
    types: [],
    categories: [],
    npmUrl: "",
    repoUrl: null,
    repoOwner: null,
    repoName: null,
    version: "1.0.0",
    publishedAt: "",
    downloadsMonth: 0,
    stars: null,
    lastPush: null,
    openIssues: null,
    archived: null,
    maintained: false,
    install: `pi install npm:${name}`,
  };
}

test("buildIndex dedupes packages with the same name, keeping the first", () => {
  const packages = [
    pkg("pi-subagents"),
    pkg("@tintinweb/pi-subagents"),
    pkg("pi-subagents"), // duplicate
    pkg("@tintinweb/pi-subagents"), // duplicate
  ];
  const index = buildIndex("2026-07-23T00:00:00.000Z", packages);
  assert.equal(index.count, 2);
  assert.equal(index.packages.length, 2);
  assert.deepEqual(
    index.packages.map((p) => p.name),
    ["pi-subagents", "@tintinweb/pi-subagents"],
  );
});

test("buildIndex count matches packages length for an already-unique list", () => {
  const packages = [pkg("a"), pkg("b"), pkg("c")];
  const index = buildIndex("t", packages);
  assert.equal(index.count, 3);
  assert.equal(index.packages.length, 3);
});