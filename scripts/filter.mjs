export function containsBannedKeyword(text, bannedKeywords) {
  const lowerText = text.toLowerCase();
  return bannedKeywords.some((kw) => lowerText.includes(kw.toLowerCase()));
}

export function filterByBannedKeywords(candidates, bannedKeywords) {
  return candidates.filter(
    (c) => !containsBannedKeyword(c.text, bannedKeywords)
  );
}
