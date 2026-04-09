/**
 * Strip HTML comments (<!-- ... -->) from markdown, including multi-line.
 * Also collapses resulting 3+ blank lines to 2.
 */
export function stripHtmlComments(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
