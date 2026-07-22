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
    ? 'Užpildyta · treniruotė pilna'
    : spotsLeft === 1
      ? 'Liko 1 vieta'
      : spotsLeft <= 3
        ? `Liko ${spotsLeft} vietos · beveik pilna`
        : `Liko ${spotsLeft} vietos`;
  return (
    <div>
      <ProgressBar value={pct} tone={tone} size="sm" />
      {showLabel && (
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-ink-600 dark:text-ink-400">
            Užsiregistravo {registered} iš {capacity}
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
