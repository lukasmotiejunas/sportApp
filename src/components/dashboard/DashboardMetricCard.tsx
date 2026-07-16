import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: 'accent' | 'warning' | 'danger' | 'info' | 'neutral';
  onClick?: () => void;
};

const toneMap = {
  accent: 'text-lime-700 bg-lime-100 dark:text-lime-200 dark:bg-lime-400/15',
  warning: 'text-amber-800 bg-amber-100 dark:text-amber-200 dark:bg-amber-500/15',
  danger: 'text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-500/15',
  info: 'text-sky-700 bg-sky-100 dark:text-sky-200 dark:bg-sky-500/15',
  neutral: 'text-ink-700 bg-ink-100 dark:text-ink-200 dark:bg-ink-800',
};

export function DashboardMetricCard({ icon: Icon, label, value, hint, tone = 'neutral', onClick }: Props) {
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'surface p-4 text-left transition-all',
        onClick && 'hover:shadow-card hover:border-ink-300 dark:hover:border-ink-600',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={clsx('grid h-9 w-9 place-items-center rounded-xl', toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-ink-900 dark:text-ink-50 tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </Tag>
  );
}
