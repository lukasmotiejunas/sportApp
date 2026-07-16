import clsx from 'clsx';

type Props = {
  value: number; // 0-100
  tone?: 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
};

const toneMap = {
  accent: 'bg-lime-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  neutral: 'bg-ink-800 dark:bg-ink-200',
};

export function ProgressBar({ value, tone = 'accent', size = 'md', className }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={clsx(
        'w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800',
        size === 'sm' ? 'h-1.5' : 'h-2.5',
        className,
      )}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={clsx('h-full rounded-full transition-all duration-500', toneMap[tone])}
        style={{ width: pct + '%' }}
      />
    </div>
  );
}
