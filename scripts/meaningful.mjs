/**
 * Returns true if text has substantive content (not just list markers,
 * separators, or whitespace).
 */
export function isMeaningful(text) {
  if (!text) return false;
  const cleaned = text
    .replace(/[\s\n]+/g, " ")
    .replace(/^[\d.\-*>#\s|]+$/, "") // pure list/separator chars
    .trim();
  // require at least 8 characters of real content
  return cleaned.length >= 8;
}
