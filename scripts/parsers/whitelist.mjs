export function shouldScanFilename(filename, whitelist, blacklist) {
  if (blacklist.some((kw) => filename.includes(kw))) return false;
  return whitelist.some((kw) => filename.includes(kw));
}
