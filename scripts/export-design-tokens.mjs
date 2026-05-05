#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const designPath = resolve(repoRoot, "DESIGN.md");
const outputPath = resolve(repoRoot, "src/design-tokens.css");
const checkMode = process.argv.includes("--check");

function parseScalar(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseSimpleYaml(yaml) {
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (const rawLine of yaml.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) {
      continue;
    }

    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;
    const line = rawLine.trim();
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1);

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].value;

    if (!rawValue.trim()) {
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }

  return root;
}

function readDesignTokens() {
  const design = readFileSync(designPath, "utf8");
  const frontMatterMatch = design.match(/^---\n([\s\S]*?)\n---/);

  if (!frontMatterMatch) {
    throw new Error("DESIGN.md must start with YAML front matter.");
  }

  return parseSimpleYaml(frontMatterMatch[1]);
}

function kebab(value) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function resolveTokenReference(value, tokens) {
  const match = typeof value === "string" ? value.match(/^\{(.+)\}$/) : null;

  if (!match) {
    return value;
  }

  return getPath(tokens, match[1].split("."));
}

function getPath(source, segments) {
  return segments.reduce((current, segment) => {
    if (!current || !(segment in current)) {
      throw new Error(`Unknown design token reference: ${segments.join(".")}`);
    }

    return current[segment];
  }, source);
}

function collectTypographyVariables(tokens) {
  const lines = [];

  for (const [name, scale] of Object.entries(tokens.typography ?? {})) {
    for (const [property, value] of Object.entries(scale)) {
      lines.push(`  --${kebab(name)}-${kebab(property)}: ${value};`);
    }
  }

  return lines;
}

function collectComponentAliases(tokens) {
  const components = tokens.components ?? {};

  return [
    ["radius-card", components.card?.rounded],
    ["radius-control", components["button-primary"]?.rounded],
    ["space-page", components["app-shell"]?.padding],
    ["space-card", components.card?.padding],
    ["sidebar-width", components.sidebar?.width],
    ["right-rail-width", components["right-rail"]?.width],
    ["topbar-height", components["top-bar"]?.height],
    ["shadow-card", tokens.effects?.["shadow-card"]]
  ]
    .filter(([, value]) => value)
    .map(([name, value]) => `  --${name}: ${resolveTokenReference(value, tokens)};`);
}

function buildCss(tokens) {
  const lines = [
    "/* Generated from DESIGN.md. Do not edit by hand.",
    "   Run: npm run design:tokens */",
    ":root {"
  ];

  for (const [name, value] of Object.entries(tokens.colors ?? {})) {
    lines.push(`  --${name}: ${value};`);
  }

  lines.push("");

  for (const [name, value] of Object.entries(tokens.rounded ?? {})) {
    lines.push(`  --radius-${name}: ${value};`);
  }

  lines.push("");

  for (const [name, value] of Object.entries(tokens.spacing ?? {})) {
    lines.push(`  --space-${name}: ${value};`);
  }

  lines.push("", ...collectTypographyVariables(tokens), "", ...collectComponentAliases(tokens));
  lines.push("}", "");

  return lines.join("\n");
}

const css = buildCss(readDesignTokens());

if (checkMode) {
  const current = readFileSync(outputPath, "utf8");

  if (current !== css) {
    throw new Error("src/design-tokens.css is out of sync. Run npm run design:tokens.");
  }

  console.log("src/design-tokens.css is in sync with DESIGN.md.");
} else {
  writeFileSync(outputPath, css);
  console.log("Wrote src/design-tokens.css from DESIGN.md.");
}
