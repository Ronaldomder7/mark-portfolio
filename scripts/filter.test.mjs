import { describe, it, expect } from "vitest";
import { containsBannedKeyword, filterByBannedKeywords } from "./filter.mjs";

describe("containsBannedKeyword", () => {
  it("returns true when text contains banned keyword", () => {
    expect(containsBannedKeyword("今天和爷爷聊天", ["爷爷"])).toBe(true);
  });

  it("returns false when text is clean", () => {
    expect(containsBannedKeyword("在思考 AI 和内容", ["爷爷"])).toBe(false);
  });

  it("is case-insensitive for English but exact for Chinese", () => {
    expect(containsBannedKeyword("Like Mama", ["mama"])).toBe(true);
  });
});

describe("filterByBannedKeywords", () => {
  it("filters out candidates containing any banned keyword", () => {
    const input = [
      { text: "AI 工作流设计" },
      { text: "今天老板说了什么" },
      { text: "为什么我要建系统" },
    ];
    const result = filterByBannedKeywords(input, ["老板"]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.text)).toEqual([
      "AI 工作流设计",
      "为什么我要建系统",
    ]);
  });
});
