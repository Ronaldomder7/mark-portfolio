/**
 * Strip inline AI-generated annotations from Mark's logs.
 * These look like:
 *   [教练观察] ...多行内容...
 *   [教练提问] ...
 *   [系统] ...
 *   [AI观察] ...
 *
 * Any line starting with [keyword] where keyword matches known AI markers,
 * AND all indented/continuation lines that follow it until the next blank line
 * or a non-indented non-list line.
 */
const AI_MARKERS = [
  "教练观察", "教练提问", "教练分析", "教练总结", "教练追问",
  "系统", "AI观察", "AI分析", "AI总结", "AI追问",
  "元能力", "P0", "P1", "P2",
];

export function stripAIAnnotations(text) {
  const lines = text.split("\n");
  const result = [];
  let skipping = false;

  for (const line of lines) {
    const isAIStart = AI_MARKERS.some((marker) => {
      return new RegExp(`^\\s*(?:>\\s*)?\\[${marker}[^\\]]*\\]`).test(line);
    });

    if (isAIStart) {
      skipping = true;
      continue;
    }

    if (skipping) {
      if (
        line.trim() === "" ||
        /^\s+/.test(line) ||
        /^\s*[-*+]/.test(line) ||
        /^\s*>/.test(line)
      ) {
        continue;
      } else {
        skipping = false;
      }
    }

    result.push(line);
  }

  return result.join("\n").trim();
}
