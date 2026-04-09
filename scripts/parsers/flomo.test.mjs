import { describe, it, expect } from "vitest";
import { parseFlomoFilename, parseFlomoContent } from "./flomo.mjs";

describe("parseFlomoFilename", () => {
  it("extracts YYYY-MM-DD from filename prefix", () => {
    const fn = "2026-02-16 我觉得人不能活一辈子，最后只有两个字.md";
    expect(parseFlomoFilename(fn)).toEqual({
      date: "2026-02-16",
      preview: "我觉得人不能活一辈子，最后只有两个字",
    });
  });

  it("returns null for filenames without date prefix", () => {
    expect(parseFlomoFilename("README.md")).toBeNull();
  });
});

describe("parseFlomoContent", () => {
  it("returns body trimmed", () => {
    expect(parseFlomoContent("  hello world  \n\n")).toBe("hello world");
  });
});
