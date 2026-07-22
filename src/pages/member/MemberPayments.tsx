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
  overdue: 'danger',
  pending: 'warning',
} as const;

const paymentLabel = {
  paid: 'Apmokėta',
  overdue: 'Vėluoja',
  pending: 'Laukiama',
} as const;

export default function MemberPayments() {
  const member = useCurrentMember();
  const plans = useStore((s) => s.membershipPlans);
  const simulatePayment = useStore((s) => s.simulatePayment);
  const push = useStore((s) => s.pushToast);
  const plan = plans.find((p) => p.id === member.membershipPlanId);

  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState('visa');

  if (!plan) {
    return (
      <div>
        <PageTitle title="Mokėjimai" description="Jūsų narystės planas ir mokėjimų istorija." eyebrow="Narystė" />
        <section className="surface p-6 text-center">
          <CreditCard className="mx-auto mb-3 h-8 w-8 text-ink-400" />
          <p className="font-display text-lg font-bold">Narystės planas dar nepriskirtas</p>
          <p className="mt-1 text-sm text-ink-500">
            Kai administratorius priskirs jums narystės planą, čia matysite savo mokėjimus.
          </p>
        </section>
      </div>
    );
  }

  const history = [
    { id: 'h1', month: 'Šį mėnesį', status: member.paymentStatus, date: member.lastPaymentDate, amount: plan.monthlyFee },
    { id: 'h2', month: 'Praėjusį mėnesį', status: 'paid' as const, date: addDays(member.lastPaymentDate, -30), amount: plan.monthlyFee },
    { id: 'h3', month: 'Prieš 2 mėnesius', status: 'paid' as const, date: addDays(member.lastPaymentDate, -60), amount: plan.monthlyFee },
    { id: 'h4', month: 'Prieš 3 mėnesius', status: 'paid' as const, date: addDays(member.lastPaymentDate, -90), amount: plan.monthlyFee },
  ];

  const doPay = () => {
    simulatePayment(member.id);
    setPayOpen(false);
    push({ kind: 'success', message: 'Prototipo mokėjimas atliktas — narystė pratęsta.' });
  };

  return (
    <div>
      <PageTitle title="Mokėjimai" description="Jūsų narystės planas ir mokėjimų istorija." eyebrow="Narystė" />

      <PaymentStatusBanner
        status={member.paymentStatus}
        amount={formatCurrency(plan.monthlyFee)}
        dueDate={formatDateShort(member.paymentDueDate)}
        actionLabel={
          member.paymentStatus === 'paid' ? 'Pratęsti anksčiau' : 'Apmokėti dabar — prototipas'
        }
        onAction={() => setPayOpen(true)}
      />

      <section className="surface mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Dabartinis planas</p>
            <p className="font-display text-lg font-bold">{plan.name}</p>
            <p className="text-sm text-ink-500">Mokama kiekvieno mėnesio 1 dieną</p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold tabular-nums">{formatCurrency(plan.monthlyFee)}</p>
            <p className="text-xs text-ink-500">per mėnesį</p>
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 text-sm dark:bg-ink-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Neribotos registracijos į treniruotes
          </li>
          <li className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 text-sm dark:bg-ink-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Asmeniniai trenerio parengti planai
          </li>
          <li className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 text-sm dark:bg-ink-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Visa prieiga prie rezultatų lentelių
          </li>
          <li className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 text-sm dark:bg-ink-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Pirmenybė klubo varžybose
          </li>
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 font-display text-base font-bold">Mokėjimų istorija</h2>
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
            <CreditCard className="h-5 w-5 text-lime-600" /> Prototipo mokėjimas
          </span>
        }
        description="Jokia kortelė nebus apmokestinta. Tai simuliuotas atsiskaitymas — pažyma virš išlieka matoma tikslingai."
        footer={
          <>
            <button className="btn-ghost" onClick={() => setPayOpen(false)}>Atšaukti</button>
            <button className="btn-primary" onClick={doPay}>
              Apmokėti {formatCurrency(plan.monthlyFee)}
            </button>
          </>
        }
      >
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
          Prototipo simuliacija — jokia kortelė neapdorojama ir jokie pinigai nepervedami.
        </div>
        <div className="mt-4 space-y-2">
          {[
            { id: 'visa', label: 'Visa · 4242', hint: 'Numatytoji kortelė' },
            { id: 'sepa', label: 'SEPA tiesioginis debetas', hint: 'LT12 xxxx xxxx 4242' },
            { id: 'apple', label: 'Apple Pay', hint: 'Simuliuota' },
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
