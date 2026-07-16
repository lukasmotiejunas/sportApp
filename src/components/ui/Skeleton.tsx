import clsx from 'clsx';

type Props = {
  className?: string;
};

export function Skeleton({ className }: Props) {
  return (
    <div
      className={clsx(
        'animate-pulse-soft rounded-lg bg-ink-100 dark:bg-ink-800',
        className,
      )}
    />
  );
}
