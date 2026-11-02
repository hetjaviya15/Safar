export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
export function parseDateKey(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function formatDate(value) {
  if (!value) return 'Not set';
  return parseDateKey(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
export function tripDuration(start, end) {
  return Math.max(1, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1);
}
export function todayKey() {
  return toDateKey(new Date());
}