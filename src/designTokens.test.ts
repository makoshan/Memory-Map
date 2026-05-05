import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DESIGN.md token export", () => {
  it("keeps generated CSS tokens in sync with DESIGN.md", () => {
    const output = execFileSync("node", ["scripts/export-design-tokens.mjs", "--check"], {
      encoding: "utf8"
    });

    expect(output).toContain("src/design-tokens.css is in sync");
  });

  it("makes styles.css consume generated design tokens instead of redeclaring them", () => {
    const styles = readFileSync("src/styles.css", "utf8");

    expect(styles).toContain('@import "./design-tokens.css";');
    expect(styles).not.toContain("--primary: #4B9CFF");
    expect(styles).not.toContain("--bg-main: #F7F8FB");
  });
});
