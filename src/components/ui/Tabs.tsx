import clsx from 'clsx';

type Item = { id: string; label: string; badge?: string | number };

type Props = {
  items: Item[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline';
};

export function Tabs({ items, active, onChange, variant = 'pills' }: Props) {
  if (variant === 'underline') {
    return (
      <div className="flex gap-6 border-b border-ink-200 dark:border-ink-800" role="tablist">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active === it.id}
            onClick={() => onChange(it.id)}
            className={clsx(
              'relative pb-3 text-sm font-semibold transition-colors',
              active === it.id
                ? 'text-ink-900 dark:text-ink-50'
                : 'text-ink-500 hover:text-ink-800 dark:text-ink-400',
            )}
          >
            {it.label}
            {it.badge != null && (
              <span className="ml-1.5 text-xs text-ink-400">{it.badge}</span>
            )}
            {active === it.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-ink-900 dark:bg-lime-400 rounded-t" />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center rounded-full border border-ink-200 bg-white p-1 dark:border-ink-800 dark:bg-ink-900" role="tablist">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={active === it.id}
          onClick={() => onChange(it.id)}
          className={clsx(
            'rounded-full px-3.5 h-8 text-sm font-semibold transition-colors',
            active === it.id
              ? 'bg-ink-900 text-white dark:bg-lime-400 dark:text-ink-950'
              : 'text-ink-600 hover:text-ink-900 dark:text-ink-300',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
