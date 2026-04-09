import { describe, it, expect } from "vitest";
import { isMeaningful } from "./meaningful.mjs";

describe("isMeaningful", () => {
  it("returns false for empty", () => {
    expect(isMeaningful("")).toBe(false);
    expect(isMeaningful("   ")).toBe(false);
  });

  it("returns false for numbered list stub", () => {
    expect(isMeaningful("1.")).toBe(false);
    expect(isMeaningful("1. ")).toBe(false);
  });

  it("returns false for horizontal rule", () => {
    expect(isMeaningful("---")).toBe(false);
    expect(isMeaningful("***")).toBe(false);
  });

  it("returns false for too short content", () => {
    expect(isMeaningful("是的")).toBe(false);
  });

  it("returns true for real content", () => {
    expect(isMeaningful("今天的认知变化是什么")).toBe(true);
    expect(isMeaningful("1. 认识到我需要独立思考")).toBe(true);
  });
});
