import { describe, it, expect } from "vitest";
import { withinDays, filterByTimeWindow } from "./timeWindow.mjs";

describe("withinDays", () => {
  it("returns true when date is within N days from now", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    expect(withinDays(recent.toISOString().slice(0, 10), 30)).toBe(true);
  });

  it("returns false when date is outside window", () => {
    const old = new Date();
    old.setDate(old.getDate() - 60);
    expect(withinDays(old.toISOString().slice(0, 10), 30)).toBe(false);
  });
});

describe("filterByTimeWindow", () => {
  it("keeps only candidates with date within window", () => {
    const today = new Date().toISOString().slice(0, 10);
    const old = new Date();
    old.setDate(old.getDate() - 100);
    const oldStr = old.toISOString().slice(0, 10);

    const input = [
      { date: today, text: "new" },
      { date: oldStr, text: "old" },
    ];
    const result = filterByTimeWindow(input, 30);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("new");
  });
});
