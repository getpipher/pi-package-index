import type { Package } from "../src/lib/types";

interface CategoryRule {
  tag: string;
  re: RegExp;
}

// Open set — keep aligned with ALL_CATEGORIES in src/lib/types.ts.
const RULES: CategoryRule[] = [
  { tag: "mcp", re: /\bmcp\b|model[ -]?context[ -]?protocol/i },
  { tag: "solana", re: /solana|\bsvm\b|anchor|metaplex|helius|jupiter|drift|kamino/i },
  { tag: "web", re: /\bweb\b|url fetch|fetch url|http|scrape|crawl|webhook/i },
  { tag: "browser", re: /browser|chrome|chromium|playwright|puppeteer|automation|cdp/i },
  { tag: "memory", re: /\bmemory\b|remember|recall|long[ -]?term/i },
  { tag: "context", re: /context window|context.?compress|token compress|\btokens?\b.*compress/i },
  { tag: "subagent", re: /sub[ -]?agent|delegat|orchestr|spawn.*agent/i },
  { tag: "vision", re: /vision|image|ocr|screenshot|\bimage gen\b/i },
  { tag: "git", re: /\bgit\b|github|commit|branch|pull request|\bpr\b|merge request/i },
  { tag: "plan", re: /\bplan\b|\btodo\b|\btasks?\b|roadmap/i },
  { tag: "theme", re: /\btheme\b|color scheme|colour scheme|ui theme/i },
  { tag: "prompt", re: /\bprompt\b|prompt template|slash command/i },
  { tag: "skill", re: /\bskill\b/i },
  { tag: "linter", re: /lint|format|prettier|eslint|fixer/i },
  { tag: "security", re: /security|audit|vuln|secret|permission/i },
];

export function tagCategories(name: string, description: string): string[] {
  const text = `${name} ${description}`;
  const hits: string[] = [];
  for (const rule of RULES) {
    if (rule.re.test(text)) hits.push(rule.tag);
  }
  return hits;
}

const TYPE_RULES: { type: Package["types"][number]; re: RegExp }[] = [
  { type: "extension", re: /extension|tool|adds?\b.*\btool/i },
  { type: "skill", re: /\bskill\b/i },
  { type: "theme", re: /\btheme\b/i },
  { type: "prompt", re: /prompt template|prompt file/i },
];

export function detectTypes(name: string, description: string): Package["types"] {
  const text = `${name} ${description}`.toLowerCase();
  const types = TYPE_RULES.filter((r) => r.re.test(text)).map((r) => r.type);
  // The vast majority of pi packages are extensions; default when undetected.
  if (types.length === 0) return ["extension"];
  return types;
}