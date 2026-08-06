import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

type Props = {
  title: string;
  description?: string;
  backTo?: string;
  action?: React.ReactNode;
  eyebrow?: string;
};

export function PageTitle({ title, description, backTo, action, eyebrow }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        {backTo && (
          <Link
            to={backTo}
            className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-900 dark:hover:text-ink-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Atgal
          </Link>
        )}
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-widest text-lime-600 dark:text-lime-400">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-950 dark:text-ink-50">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 sm:ml-auto">{action}</div>}
    </div>
  );
}
