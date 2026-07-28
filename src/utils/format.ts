import type { LeaderboardCategory } from '../types';

export function formatCurrency(value: number, currency = 'EUR'): string {
  try {
    return value.toLocaleString('lt-LT', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
    return `${symbol}${value.toFixed(2)}`;
  }
}

export function formatSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(2)}s`;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds - mins * 60;
  return `${mins}:${secs.toFixed(0).padStart(2, '0')}`;
}

export function formatResult(value: number, category: LeaderboardCategory): string {
  switch (category.measurementType) {
    case 'seconds':
      if (value >= 60) {
        const mins = Math.floor(value / 60);
        const secs = value - mins * 60;
        return `${mins}:${secs.toFixed(0).padStart(2, '0')}`;
      }
      return `${value.toFixed(2)} s`;
    case 'ms':
      return `${value.toFixed(0)} ms`;
    case 'distance_km':
      return `${value.toFixed(1)} km`;
    case 'points':
      return `${value.toFixed(0)} t.`;
    default:
      return String(value);
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes - h * 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}
