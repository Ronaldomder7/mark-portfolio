export function parseFlomoFilename(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})\s+(.+?)(?:\s*\(\d+\))?\.md$/);
  if (!match) return null;
  return {
    date: match[1],
    preview: match[2].trim(),
  };
}

export function parseFlomoContent(content) {
  return content.trim();
}
