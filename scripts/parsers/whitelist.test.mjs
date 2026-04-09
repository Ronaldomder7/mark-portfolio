import { describe, it, expect } from "vitest";
import { shouldScanFilename } from "./whitelist.mjs";

describe("shouldScanFilename", () => {
  const whitelist = ["规划", "复盘", "选题"];
  const blacklist = ["日常产出", "提示词", "配置"];

  it("returns true when name contains whitelist keyword", () => {
    expect(shouldScanFilename("20260310_人生规划对话.md", whitelist, blacklist)).toBe(true);
  });

  it("returns false when name contains blacklist keyword", () => {
    expect(shouldScanFilename("20260310_文案日常产出.md", whitelist, blacklist)).toBe(false);
  });

  it("blacklist takes precedence over whitelist", () => {
    expect(
      shouldScanFilename("20260310_选题_日常产出.md", whitelist, blacklist)
    ).toBe(false);
  });

  it("returns false when name matches neither", () => {
    expect(shouldScanFilename("20260310_random.md", whitelist, blacklist)).toBe(false);
  });
});
