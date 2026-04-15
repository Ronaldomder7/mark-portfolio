import { describe, it, expect } from "vitest";
import { calculateCoverage, isRevealed } from "../../lib/flashlightReveal";

describe("flashlightReveal", () => {
  it("returns 0 coverage when no points visited", () => {
    expect(calculateCoverage([], 100, 100)).toBe(0);
  });

  it("returns higher coverage with more points", () => {
    const few = calculateCoverage([{ x: 50, y: 50, r: 30 }], 200, 100);
    const many = calculateCoverage(
      [
        { x: 30, y: 30, r: 30 },
        { x: 100, y: 30, r: 30 },
        { x: 170, y: 30, r: 30 },
        { x: 30, y: 70, r: 30 },
        { x: 100, y: 70, r: 30 },
        { x: 170, y: 70, r: 30 },
      ],
      200,
      100
    );
    expect(many).toBeGreaterThan(few);
  });

  it("isRevealed returns true when coverage >= threshold", () => {
    expect(isRevealed(0.85, 0.8)).toBe(true);
    expect(isRevealed(0.5, 0.8)).toBe(false);
    expect(isRevealed(0.8, 0.8)).toBe(true); // boundary
  });
});
