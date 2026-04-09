/**
 * Parse a flomo markdown file's content.
 * Strips YAML frontmatter and returns the actual body content.
 */
export function parseFlomoBody(fullContent) {
  // Strip YAML frontmatter: ---\n...\n---
  const withoutFrontmatter = fullContent.replace(/^---\n[\s\S]*?\n---\n/, "");
  return withoutFrontmatter.trim();
}
