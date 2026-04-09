import { describe, it, expect } from "vitest";
import { parseFlomoBody } from "./flomoBody.mjs";

describe("parseFlomoBody", () => {
  it("strips YAML frontmatter", () => {
    const input = `---
date: 2026-01-28
source: flomo
---

没有一个好的钉子，就不要买无数把锤子去砸。

最近出了各种各样的东西。`;
    const result = parseFlomoBody(input);
    expect(result).toContain("没有一个好的钉子");
    expect(result).toContain("最近出了");
    expect(result).not.toContain("date:");
    expect(result).not.toContain("source: flomo");
  });

  it("handles missing frontmatter gracefully", () => {
    expect(parseFlomoBody("plain content")).toBe("plain content");
  });

  it("trims result", () => {
    const input = "---\ndate: x\n---\n\n  content  \n\n";
    expect(parseFlomoBody(input)).toBe("content");
  });
});
