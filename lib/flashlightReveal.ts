export interface Circle {
  x: number;
  y: number;
  r: number;
}

/**
 * Rough coverage estimate: sample a grid of points across the rectangle
 * and check what fraction fall inside at least one circle.
 *
 * Not pixel-perfect — but cheap enough to call on every pointer move.
 */
export function calculateCoverage(
  circles: Circle[],
  width: number,
  height: number,
  step = 10
): number {
  if (circles.length === 0) return 0;
  let total = 0;
  let covered = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      total++;
      for (const c of circles) {
        const dx = x - c.x;
        const dy = y - c.y;
        if (dx * dx + dy * dy <= c.r * c.r) {
          covered++;
          break;
        }
      }
    }
  }
  return total === 0 ? 0 : covered / total;
}

export function isRevealed(coverage: number, threshold: number): boolean {
  return coverage >= threshold;
}
