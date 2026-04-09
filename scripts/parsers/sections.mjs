/**
 * Extract content under markdown sections matching keywords.
 * @param {string} markdown - full markdown content
 * @param {string[]} sectionKeywords - keywords to match against section titles (substring match)
 * @param {object} opts
 * @param {number[]} opts.levels - which heading levels to consider, e.g. [2, 3]. Default [2].
 * @returns {Array<{section: string, level: number, body: string}>}
 */
export function extractSections(markdown, sectionKeywords, opts = {}) {
  const levels = opts.levels || [2];
  const lines = markdown.split("\n");
  const results = [];

  let currentSection = null;
  let currentLevel = null;
  let currentBody = [];

  const flush = () => {
    if (currentSection) {
      const body = currentBody.join("\n").trim();
      if (body) {
        results.push({ section: currentSection, level: currentLevel, body });
      }
    }
    currentSection = null;
    currentLevel = null;
    currentBody = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2];

      if (currentSection && level <= currentLevel) {
        flush();
      }

      if (levels.includes(level)) {
        const matched = sectionKeywords.find((kw) => title.includes(kw));
        if (matched) {
          currentSection = title;
          currentLevel = level;
        }
      }
      continue;
    }

    if (currentSection) {
      currentBody.push(line);
    }
  }
  flush();

  return results;
}
