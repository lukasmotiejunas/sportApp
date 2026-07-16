import { ProgressBar } from '../ui/ProgressBar';

type Props = {
  registered: number;
  capacity: number;
  showLabel?: boolean;
};

export function CapacityProgress({ registered, capacity, showLabel = true }: Props) {
  const pct = Math.round((registered / capacity) * 100);
  const tone: 'accent' | 'warning' | 'danger' =
    pct >= 100 ? 'danger' : pct >= 90 ? 'warning' : 'accent';
  const spotsLeft = Math.max(capacity - registered, 0);
  const label = spotsLeft === 0
    ? 'Full · session at capacity'
    : spotsLeft === 1
      ? '1 spot remaining'
      : spotsLeft <= 3
        ? `${spotsLeft} spots remaining · almost full`
        : `${spotsLeft} spots remaining`;
  return (
    <div>
      <ProgressBar value={pct} tone={tone} size="sm" />
      {showLabel && (
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-ink-600 dark:text-ink-400">
            {registered} of {capacity} registered
          </span>
          <span
            className={
              spotsLeft === 0
                ? 'font-semibold text-red-600'
                : spotsLeft <= 3
                  ? 'font-semibold text-amber-600'
                  : 'font-medium text-ink-500'
            }
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
