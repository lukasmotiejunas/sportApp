export const DAY_NAMES = ['Sk', 'Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št'];
export const DAY_NAMES_LONG = [
  'Sekmadienis',
  'Pirmadienis',
  'Antradienis',
  'Trečiadienis',
  'Ketvirtadienis',
  'Penktadienis',
  'Šeštadienis',
];
export const MONTH_NAMES = [
  'Sausio',
  'Vasario',
  'Kovo',
  'Balandžio',
  'Gegužės',
  'Birželio',
  'Liepos',
  'Rugpjūčio',
  'Rugsėjo',
  'Spalio',
  'Lapkričio',
  'Gruodžio',
];

export function isoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function formatDateShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '—';
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
}

export function formatDateLong(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '—';
  return `${DAY_NAMES_LONG[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function todayIso(now = new Date()): string {
  return isoDate(now);
}

export function relativeDay(iso: string, now = new Date()): string {
  const today = todayIso(now);
  if (iso === today) return 'Šiandien';
  if (iso === addDays(today, 1)) return 'Rytoj';
  if (iso === addDays(today, -1)) return 'Vakar';
  const d = new Date(iso + 'T00:00:00');
  const diff = Math.round(
    (d.getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000,
  );
  if (diff > 1 && diff < 7) return DAY_NAMES_LONG[d.getDay()];
  return formatDateShort(iso);
}

export function isPast(iso: string, now = new Date()): boolean {
  return iso < todayIso(now);
}

export function daysUntil(iso: string, now = new Date()): number {
  const target = new Date(iso + 'T00:00:00').getTime();
  const t = new Date(todayIso(now) + 'T00:00:00').getTime();
  return Math.round((target - t) / 86400000);
}

export function nextNDates(startIso: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(startIso, i));
}
