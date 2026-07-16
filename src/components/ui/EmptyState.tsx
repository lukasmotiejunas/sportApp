import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white/50 py-10 px-6 text-center dark:border-ink-800 dark:bg-ink-900/40">
      <div className="mb-3 rounded-2xl bg-ink-100 p-3 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
