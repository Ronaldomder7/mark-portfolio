export function withinDays(dateStr, days) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export function filterByTimeWindow(candidates, days) {
  return candidates.filter((c) => withinDays(c.date, days));
}
