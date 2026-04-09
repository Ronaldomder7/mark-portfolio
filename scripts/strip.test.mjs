import { describe, it, expect } from "vitest";
import { stripHtmlComments } from "./strip.mjs";

describe("stripHtmlComments", () => {
  it("removes single-line HTML comments", () => {
    expect(stripHtmlComments("hello <!-- comment --> world")).toBe("hello  world");
  });

  it("removes multi-line HTML comments", () => {
    const input = "before\n<!--\nmulti\nline\n-->\nafter";
    expect(stripHtmlComments(input)).toBe("before\n\nafter");
  });

  it("returns empty when only comments", () => {
    expect(stripHtmlComments("<!-- only comment -->")).toBe("");
  });

  it("collapses excessive blank lines left after stripping", () => {
    const input = "line1\n<!-- gone -->\n\n\n\nline2";
    expect(stripHtmlComments(input)).toBe("line1\n\nline2");
  });
});
