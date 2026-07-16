import clsx from 'clsx';

type Props = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
};

export function FilterChip({ active, onClick, children, icon }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 h-9 text-sm font-semibold transition-colors',
        active
          ? 'bg-ink-900 text-white dark:bg-lime-400 dark:text-ink-950'
          : 'bg-white text-ink-700 border border-ink-200 hover:border-ink-400 dark:bg-ink-900 dark:text-ink-200 dark:border-ink-700',
      )}
      aria-pressed={active}
    >
      {icon}
      {children}
    </button>
  );
}
