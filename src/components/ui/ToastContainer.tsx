import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert,
};

const toneMap = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-100',
  error: 'border-red-200 bg-red-50 text-red-900 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-100',
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-100',
};

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-2 z-[110] flex flex-col items-center gap-2 px-3 sm:top-4"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = iconMap[t.kind];
        return (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-3.5 py-3 shadow-pop animate-slide-up',
              toneMap[t.kind],
            )}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button
              type="button"
              className="rounded-full p-1 hover:bg-black/5"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
