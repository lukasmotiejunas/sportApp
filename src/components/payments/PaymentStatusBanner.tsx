import { AlertOctagon, CheckCircle2 } from 'lucide-react';
import type { PaymentStatus } from '../../types';
import clsx from 'clsx';

type Props = {
  status: PaymentStatus;
  amount: string;
  dueDate: string;
  onAction?: () => void;
  actionLabel?: string;
};

const config = {
  paid: {
    icon: CheckCircle2,
    tone: 'from-emerald-500/10 to-emerald-500/5 border-emerald-200 text-emerald-800 dark:text-emerald-200 dark:border-emerald-500/30',
    title: 'Membership is active',
    description: 'Thanks — your payment for this month is settled. Enjoy every session.',
  },
  overdue: {
    icon: AlertOctagon,
    tone: 'from-red-500/15 to-red-500/5 border-red-200 text-red-900 dark:text-red-200 dark:border-red-500/40',
    title: 'Membership payment overdue',
    description: 'Registration for trainings is paused until your payment is up to date.',
  },
} as const;

export function PaymentStatusBanner({ status, amount, dueDate, onAction, actionLabel }: Props) {
  const c = config[status];
  const Icon = c.icon;
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-3xl border p-4 sm:p-5 bg-gradient-to-br',
        c.tone,
      )}
      role={status === 'overdue' ? 'alert' : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 dark:bg-white/10">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {amount} · Due {dueDate}
          </p>
          <h3 className="mt-0.5 font-display text-lg font-semibold">{c.title}</h3>
          <p className="mt-1 text-sm opacity-90">{c.description}</p>
        </div>
      </div>
      {onAction && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onAction}
            className="btn-accent h-9 px-4 text-sm"
          >
            {actionLabel ?? 'Pay now'}
          </button>
        </div>
      )}
    </div>
  );
}
