import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  ExternalLink,
  FileText,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useStore, useCurrentMember } from "../../store/useStore";
import { PageTitle } from "../../components/layout/PageTitle";
import { PaymentStatusBanner } from "../../components/payments/PaymentStatusBanner";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { formatCurrency } from "../../utils/format";
import { formatDateShort } from "../../utils/dates";
import {
  cancelMySubscriptionApi,
  fetchMyBillingApi,
  type MyBillingResponse,
} from "../../api/endpoints";
import { ApiError } from "../../api/client";

const invoiceTone: Record<string, "success" | "warning" | "danger" | "info"> = {
  paid: "success",
  open: "warning",
  uncollectible: "danger",
  void: "info",
  draft: "info",
};

const invoiceLabel: Record<string, string> = {
  paid: "Apmokėta",
  open: "Laukiama",
  uncollectible: "Nesumokėta",
  void: "Anuliuota",
  draft: "Juodraštis",
};

export default function MemberPayments() {
  const member = useCurrentMember();
  const plans = useStore((s) => s.membershipPlans);
  const push = useStore((s) => s.pushToast);
  const refreshMyBilling = useStore((s) => s.refreshMyBilling);
  const plan = plans.find((p) => p.id === member.membershipPlanId);

  const [billing, setBilling] = useState<MyBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMyBillingApi()
      .then((data) => {
        if (!cancelled) setBilling(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Nepavyko įkelti mokėjimų.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const doCancel = async () => {
    setCancelling(true);
    try {
      await cancelMySubscriptionApi();
      const fresh = await fetchMyBillingApi();
      setBilling(fresh);
      await refreshMyBilling();
      push({
        kind: "success",
        message: "Narystė bus sustabdyta einamojo laikotarpio pabaigoje.",
      });
      setCancelOpen(false);
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "Nepavyko sustabdyti narystės.",
      });
    } finally {
      setCancelling(false);
    }
  };

  if (!plan) {
    return (
      <div>
        <PageTitle
          title="Mokėjimai"
          description="Jūsų narystės planas ir mokėjimų istorija."
          eyebrow="Narystė"
        />
        <section className="surface p-6 text-center">
          <CreditCard className="mx-auto mb-3 h-8 w-8 text-ink-400" />
          <p className="font-display text-lg font-bold">
            Narystės planas dar nepriskirtas
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Kai administratorius priskirs jums narystės planą, čia matysite savo
            mokėjimus.
          </p>
        </section>
      </div>
    );
  }

  const status = billing?.status ?? member.paymentStatus;
  const dueDateIso = billing?.currentPeriodEnd ?? member.paymentDueDate;
  const upcomingAmount = billing?.upcomingInvoice?.amount ?? plan.monthlyFee;
  const pm = billing?.defaultPaymentMethod;

  return (
    <div>
      <PageTitle
        title="Mokėjimai"
        description="Jūsų narystės planas ir mokėjimų istorija."
        eyebrow="Narystė"
      />

      <PaymentStatusBanner
        status={status}
        amount={formatCurrency(upcomingAmount)}
        dueDate={dueDateIso ? formatDateShort(dueDateIso) : "—"}
      />

      {billing?.hasSubscription && billing.cancelAtPeriodEnd && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-display text-sm font-bold">
              Narystė sustabdyta
            </p>
            <p className="mt-0.5">
              Prieiga prie treniruočių ir registracijos galios iki{" "}
              <strong>
                {dueDateIso ? formatDateShort(dueDateIso) : "einamojo laikotarpio pabaigos"}
              </strong>
              . Po to prenumerata bus atšaukta ir mokėjimai nebus nurašomi.
            </p>
          </div>
        </div>
      )}

      <section className="surface mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Dabartinis planas
            </p>
            <p className="font-display text-lg font-bold">{plan.name}</p>
            <p className="text-sm text-ink-500">
              {billing?.hasSubscription
                ? billing.cancelAtPeriodEnd
                  ? `Bus nutraukta ${dueDateIso ? formatDateShort(dueDateIso) : ""}`
                  : "Automatinis mėnesinis atsiskaitymas"
                : "Mokamas rankiniu būdu"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-bold tabular-nums">
              {formatCurrency(plan.monthlyFee)}
            </p>
            <p className="text-xs text-ink-500">per mėnesį</p>
          </div>
        </div>

        {pm && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50 px-3 py-2 text-sm dark:border-ink-800 dark:bg-ink-800/60">
            <CreditCard className="h-4 w-4 text-ink-500" />
            <span className="font-semibold uppercase">{pm.brand}</span>
            <span className="text-ink-500">•••• {pm.last4}</span>
          </div>
        )}

        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 text-sm dark:bg-ink-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Neribotos
            registracijos į treniruotes
          </li>
          <li className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 text-sm dark:bg-ink-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Asmeniniai
            trenerio parengti planai
          </li>
          <li className="flex items-center gap-2 rounded-xl bg-ink-50 p-2.5 text-sm dark:bg-ink-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Visa prieiga
            prie rezultatų lentelių
          </li>
        </ul>

        {billing?.hasSubscription && !billing.cancelAtPeriodEnd && (
          <div className="mt-4 flex justify-end border-t border-ink-100 pt-4 dark:border-ink-800">
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="btn-ghost h-9 px-3 text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              <XCircle className="h-4 w-4" />
              Sustabdyti narystę
            </button>
          </div>
        )}
      </section>

      <section className="mt-4">
        <h2 className="mb-2 font-display text-base font-bold">
          Mokėjimų istorija
        </h2>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        {loading && !billing ? (
          <div className="surface p-6 text-center text-sm text-ink-500">
            Kraunama…
          </div>
        ) : !billing?.hasSubscription ? (
          <div className="surface p-6 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-ink-400" />
            <p className="font-display text-base font-bold">
              Automatinių mokėjimų dar nėra
            </p>
            <p className="mt-1 text-sm text-ink-500">
              Kai klubas įjungs Stripe atsiskaitymus, čia matysite kiekvieną
              nuskaičiuotą mokėjimą su sąskaita faktūra.
            </p>
          </div>
        ) : billing.invoices.length === 0 ? (
          <div className="surface p-6 text-center text-sm text-ink-500">
            Kol kas nėra jokių sąskaitų.
          </div>
        ) : (
          <div className="surface divide-y divide-ink-100 dark:divide-ink-800">
            {billing.invoices.map((inv) => {
              const dateIso = inv.paidAt ?? inv.createdDate;
              const tone = invoiceTone[inv.status] ?? "info";
              const label = invoiceLabel[inv.status] ?? inv.status;
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {inv.number ?? "Sąskaita"}
                    </p>
                    <p className="text-xs text-ink-500">
                      {formatDateShort(dateIso)}
                      {inv.periodStart && inv.periodEnd && (
                        <span className="ml-1 text-ink-400">
                          · {formatDateShort(inv.periodStart)}–
                          {formatDateShort(inv.periodEnd)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-bold tabular-nums">
                      {formatCurrency(inv.amount)}
                    </span>
                    <StatusBadge tone={tone} dot>
                      {label}
                    </StatusBadge>
                    {inv.hostedInvoiceUrl && (
                      <a
                        href={inv.hostedInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost h-8 px-2 text-xs"
                        aria-label="Atidaryti sąskaitą"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={cancelOpen}
        onClose={() => (cancelling ? undefined : setCancelOpen(false))}
        title={
          <span className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" /> Sustabdyti narystę?
          </span>
        }
        description={
          dueDateIso
            ? `Prieiga liks aktyvi iki ${formatDateShort(dueDateIso)}. Po to prenumerata bus atšaukta, mokėjimai nebus nurašomi, o registracija į treniruotes bus išjungta.`
            : "Prenumerata bus atšaukta einamojo laikotarpio pabaigoje."
        }
        footer={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
            >
              Atgal
            </button>
            <button
              type="button"
              className="btn-primary bg-red-600 hover:bg-red-500"
              onClick={doCancel}
              disabled={cancelling}
            >
              {cancelling ? "Stabdoma…" : "Taip, sustabdyti"}
            </button>
          </>
        }
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          <AlertTriangle className="mr-1 inline h-4 w-4" />
          Sustabdžius narystę bus išjungta registracija į naujas treniruotes,
          kai baigsis apmokėtas laikotarpis.
        </div>
      </Modal>
    </div>
  );
}
