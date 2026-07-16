import clsx from 'clsx';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

const map: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  neutral: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
  accent: 'bg-lime-100 text-lime-900 dark:bg-lime-400/20 dark:text-lime-200',
};

type Props = {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
};

export function StatusBadge({ tone = 'neutral', children, className, dot = false }: Props) {
  return (
    <span className={clsx('chip', map[tone], className)}>
      {dot && (
        <span className={clsx('h-1.5 w-1.5 rounded-full', {
          'bg-emerald-500': tone === 'success',
          'bg-amber-500': tone === 'warning',
          'bg-red-500': tone === 'danger',
          'bg-sky-500': tone === 'info',
          'bg-ink-500': tone === 'neutral',
          'bg-lime-500': tone === 'accent',
        })} />
      )}
      {children}
    </span>
  );
}
