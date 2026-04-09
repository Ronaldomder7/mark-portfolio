export function extractSections(markdown, sectionKeywords) {
  const lines = markdown.split("\n");
  const results = [];

  let currentSection = null;
  let currentBody = [];

  const flush = () => {
    if (currentSection) {
      const body = currentBody.join("\n").trim();
      if (body) {
        results.push({ section: currentSection, body });
      }
    }
    currentSection = null;
    currentBody = [];
  };

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+?)\s*$/);
    if (h2Match) {
      flush();
      const title = h2Match[1];
      const matched = sectionKeywords.find((kw) => title.includes(kw));
      if (matched) {
        currentSection = title;
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
