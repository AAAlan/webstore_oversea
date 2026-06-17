export function computeRemainingDays(timeLimitEnd) {
  if (!timeLimitEnd) return null;
  const end = new Date(timeLimitEnd).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}
