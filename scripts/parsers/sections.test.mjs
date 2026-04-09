import { describe, it, expect } from "vitest";
import { extractSections } from "./sections.mjs";

describe("extractSections", () => {
  it("extracts content under matching H2 headers", () => {
    const md = `
# Title

## 事件记录
今天做了什么

## 认知突破
这是一个洞察内容

## 核心洞察
另一个洞察
`;
    const result = extractSections(md, ["认知突破", "核心洞察"]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      section: "认知突破",
      body: "这是一个洞察内容",
    });
    expect(result[1]).toEqual({
      section: "核心洞察",
      body: "另一个洞察",
    });
  });

  it("returns empty array when no matching sections", () => {
    const md = "## 事件记录\n内容";
    expect(extractSections(md, ["认知突破"])).toEqual([]);
  });

  it("matches H2 sections with keyword prefix (for ## 马克的...)", () => {
    const md = "## 马克的评估结论\n这是结论";
    const result = extractSections(md, ["马克的"]);
    expect(result).toHaveLength(1);
    expect(result[0].body).toBe("这是结论");
  });
});
