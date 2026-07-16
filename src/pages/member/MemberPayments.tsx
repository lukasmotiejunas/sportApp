import { useState } from 'react';
import { CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { useStore, useCurrentMember } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { PaymentStatusBanner } from '../../components/payments/PaymentStatusBanner';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatCurrency } from '../../utils/format';
import { formatDateShort, addDays } from '../../utils/dates';

const paymentTone = {
  paid: 'success',
  due_soon: 'warning',
  overdue: 'danger',
  processing: 'info',
} as const;

const paymentLabel = {
  paid: 'Paid',
  due_soon: 'Due soon',
  overdue: 'Overdue',
  processing: 'Processing',
} as const;

export default function MemberPayments() {
  const member = useCurrentMember();
  const plans = useStore((s) => s.membershipPlans);
  const simulatePayment = useStore((s) => s.simulatePayment);
  const push = useStore((s) => s.pushToast);
  const plan = plans.find((p) => p.id === member.membershipPlanId)!;

  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState('visa');

  const history = [
    { id: 'h1', month: 'This month', status: member.paymentStatus, date: member.lastPaymentDate, amount: plan.monthlyFee },
    { id: 'h2', month: 'Previous month', status: 'paid' as const, date: addDays(member.lastPaymentDate, -30), amount: plan.monthlyFee },
    { id: 'h3', month: '2 months ago', status: 'paid' as const, date: addDays(member.lastPaymentDate, -60), amount: plan.monthlyFee },
    { id: 'h4', month: '3 months ago', status: 'paid' as const, date: addDays(member.lastPaymentDate, -90), amount: plan.monthlyFee },
  ];

  const doPay = () => {
    simulatePayment(member.id);
    setPayOpen(false);
    push({ kind: 'success', message: 'Prototype payment completed — membership renewed.' });
  };

  return (
    <div>
      <PageTitle title="Payments" description="Your membership plan and payment history." eyebrow="Membership" />

      <PaymentStatusBanner
        status={member.paymentStatus}
        amount={formatCurrency(plan.monthlyFee)}
        dueDate={formatDateShort(member.paymentDueDate)}
        actionLabel={
          member.paymentStatus === 'paid' ? 'Renew early' : 'Pay now — prototype'
        }
        onAction={() => setPayOpen(true)}
      />

      <section className="surface mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Current plan</p>
            <p className="font-display text-lg font-bold">{plan.name}</p>
            <p className="text-sm text-ink-500">Due on day 1 of every month</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold tabular-nums">{formatCurrency(plan.monthlyFee)}</p>
            <p className="text-xs text-ink-500">per month</p>
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 text-sm dark:bg-ink-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Unlimited training registrations
          </li>
          <li className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 text-sm dark:bg-ink-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Personal coach-built plans
          </li>
          <li className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 text-sm dark:bg-ink-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Full leaderboard access
          </li>
          <li className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 text-sm dark:bg-ink-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Priority for club races
          </li>
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 font-display text-base font-bold">Payment history</h2>
        <div className="surface divide-y divide-ink-100 dark:divide-ink-800">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{h.month}</p>
                <p className="text-xs text-ink-500">{formatDateShort(h.date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-bold tabular-nums">
                  {formatCurrency(h.amount)}
                </span>
                <StatusBadge tone={paymentTone[h.status]} dot>
                  {paymentLabel[h.status]}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-lime-600" /> Prototype payment
          </span>
        }
        description="No card will be charged. This is a simulated checkout — the label above stays visible on purpose."
        footer={
          <>
            <button className="btn-ghost" onClick={() => setPayOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={doPay}>
              Pay {formatCurrency(plan.monthlyFee)}
            </button>
          </>
        }
      >
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
          Prototype simulation — no real card is processed and no funds are moved.
        </div>
        <div className="mt-4 space-y-2">
          {[
            { id: 'visa', label: 'Visa · 4242', hint: 'Default card on file' },
            { id: 'sepa', label: 'SEPA Direct Debit', hint: 'LT12 xxxx xxxx 4242' },
            { id: 'apple', label: 'Apple Pay', hint: 'Simulated' },
          ].map((m) => (
            <label
              key={m.id}
              className={
                'flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors ' +
                (method === m.id
                  ? 'border-ink-900 bg-ink-900/5 dark:border-lime-400 dark:bg-lime-400/10'
                  : 'border-ink-200 hover:border-ink-400 dark:border-ink-700')
              }
            >
              <input
                type="radio"
                name="method"
                value={m.id}
                checked={method === m.id}
                onChange={() => setMethod(m.id)}
                className="h-4 w-4 accent-ink-900 dark:accent-lime-400"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">{m.label}</p>
                <p className="text-xs text-ink-500">{m.hint}</p>
              </div>
              <CreditCard className="h-4 w-4 text-ink-400" />
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
