import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import Joyride, {
  STATUS,
  type CallBackProps,
  type Step,
} from "react-joyride";
import { PageTitle } from "../../components/layout/PageTitle";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { useStore } from "../../store/useStore";
import { ApiError } from "../../api/client";
import {
  cancelSubscription,
  deleteClub,
  fetchPayInvoiceUrl,
  fetchSubscription,
  fetchSubscriptionPayments,
  reactivateSubscription,
  resumeSubscription,
} from "../../api/subscription";
import type {
  ClubSubscription,
  SubscriptionPayment,
  SubscriptionStatus,
} from "../../types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("lt-LT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatMoney(amount: number, currency: string): string {
  try {
    return amount.toLocaleString("lt-LT", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "Bandomasis",
  active: "Aktyvi",
  past_due: "Vėluojantis mokėjimas",
  cancelled: "Atšaukta",
};

const STATUS_CLASS: Record<SubscriptionStatus, string> = {
  trialing: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300",
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  past_due: "bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-300",
  cancelled: "bg-ink-200 text-ink-700 dark:bg-ink-700 dark:text-ink-200",
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: "Apmokėta",
  open: "Laukiama",
  void: "Atšaukta",
  uncollectible: "Neapmokėta",
  draft: "Ruošiama",
};

export default function AdminSubscription() {
  const push = useStore((s) => s.pushToast);
  const setSubscriptionStatus = useStore((s) => s.setSubscriptionStatus);
  const logout = useStore((s) => s.logout);
  const clubName = useStore((s) => s.authUser?.clubName ?? "");
  const authUserId = useStore((s) => s.authUser?.id ?? "");
  const navigate = useNavigate();

  const [sub, setSub] = useState<ClubSubscription | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    "cancel" | "resume" | "reactivate" | "pay" | "delete" | null
  >(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [runTour, setRunTour] = useState(false);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        fetchSubscription(),
        fetchSubscriptionPayments(),
      ]);
      setSub(s);
      setPayments(p);
      setSubscriptionStatus(s.status);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Nepavyko įkelti prenumeratos duomenų.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doCancel = async () => {
    setBusy("cancel");
    try {
      const updated = await cancelSubscription();
      setSub(updated);
      setSubscriptionStatus(updated.status);
      push({
        kind: "success",
        message:
          updated.status === "cancelled"
            ? "Prenumerata atšaukta."
            : "Prenumerata bus atšaukta laikotarpio pabaigoje.",
      });
    } catch (err) {
      push({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Nepavyko atšaukti.",
      });
    } finally {
      setBusy(null);
    }
  };

  const doResume = async () => {
    setBusy("resume");
    try {
      const updated = await resumeSubscription();
      setSub(updated);
      setSubscriptionStatus(updated.status);
      push({ kind: "success", message: "Prenumerata pratęsta." });
    } catch (err) {
      push({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Nepavyko pratęsti.",
      });
    } finally {
      setBusy(null);
    }
  };

  const doReactivate = async () => {
    setBusy("reactivate");
    try {
      const updated = await reactivateSubscription();
      setSub(updated);
      setSubscriptionStatus(updated.status);
      push({ kind: "success", message: "Prenumerata atnaujinta." });
      // Refresh payments — a new invoice may have been generated.
      const p = await fetchSubscriptionPayments();
      setPayments(p);
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError ? err.message : "Nepavyko atnaujinti prenumeratos.",
      });
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    setBusy("delete");
    try {
      await deleteClub();
      // Session is gone with the club — clear token and send them home.
      logout();
      navigate("/plans", { replace: true });
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError ? err.message : "Nepavyko ištrinti klubo.",
      });
      setBusy(null);
    }
  };

  const openPayInvoice = async () => {
    setBusy("pay");
    try {
      const { url } = await fetchPayInvoiceUrl();
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        push({ kind: "info", message: "Neapmokėtų sąskaitų nėra." });
      }
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "Nepavyko gauti sąskaitos nuorodos.",
      });
    } finally {
      setBusy(null);
    }
  };

  const tourStorageKey = `admin_subscription_tour_seen:${authUserId || "anon"}`;
  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        "Prenumerata ir mokėjimai — čia valdote savo klubo Lumo prenumeratą ir matote, kada kartu bus nurašomas mokestis.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="subscription-card"]',
      content:
        "Prenumeratos kortelė. Rodo dabartinę būseną (bandomasis / aktyvi / vėluojantis mokėjimas / atšaukta), mokestį, kito mokėjimo datą ir kortelės informaciją. Bandomojo laikotarpio metu — kada baigsis nemokamas mėnuo.",
    },
    {
      target: '[data-tour="subscription-actions"]',
      content:
        "Veiksmai. Priklausomai nuo būsenos, čia bus mygtukai atšaukti prenumeratą, ją pratęsti („Nebeatšaukti“), atnaujinti po atšaukimo arba apmokėti vėluojančią sąskaitą. Atšaukus, klubas dar veikia iki einamojo laikotarpio pabaigos.",
    },
    {
      target: '[data-tour="payments-history"]',
      content:
        "Mokėjimų istorija. Visos jūsų mokėtos Lumo prenumeratos sąskaitos su suma, būsena ir nuoroda į Stripe sąskaitą (PDF galima atsisiųsti apskaitai).",
      placement: "top",
    },
    {
      target: '[data-tour="danger-zone"]',
      content:
        "Pavojinga zona — čia klubą galima ištrinti visam laikui. Šis veiksmas neatšaukiamas ir prieinamas tik atšaukus prenumeratą. Bus pašalinti visi nariai, treneriai, treniruotės ir rezultatai.",
      placement: "top",
    },
  ];

  useEffect(() => {
    if (loading) return;
    try {
      if (!localStorage.getItem(tourStorageKey)) {
        setRunTour(true);
      }
    } catch {
      // localStorage blocked — skip silently.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleTourCallback = (data: CallBackProps) => {
    const done: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (done.includes(data.status)) {
      setRunTour(false);
      try {
        localStorage.setItem(tourStorageKey, "1");
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="max-w-4xl">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        disableScrolling={false}
        callback={handleTourCallback}
        locale={{
          back: "Atgal",
          close: "Uždaryti",
          last: "Baigti",
          next: "Toliau",
          skip: "Praleisti",
        }}
        styles={{
          options: {
            primaryColor: "#5da004",
            zIndex: 10000,
          },
        }}
      />
      <div data-tour="page-title">
        <PageTitle
          eyebrow="Administratorius"
          title="Prenumerata ir mokėjimai"
          description="Valdykite savo klubo Lumo prenumeratą, peržiūrėkite mokėjimų istoriją."
        />
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && sub && (
        <>
          <div data-tour="subscription-card">
            <SubscriptionCard
              sub={sub}
              busy={busy}
              onCancel={() => setConfirmCancel(true)}
              onResume={doResume}
              onReactivate={doReactivate}
              onPayInvoice={openPayInvoice}
            />
          </div>

          <section className="surface mt-6" data-tour="payments-history">
            <div className="border-b border-ink-100 p-4 dark:border-ink-800">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <CreditCard className="h-4 w-4 text-ink-500" /> Mokėjimų istorija
              </h2>
            </div>
            {payments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="Mokėjimų dar nėra"
                description="Kai baigsis bandomasis laikotarpis, čia pasirodys sąskaitos."
              />
            ) : (
              <PaymentsTable payments={payments} />
            )}
          </section>

          <div data-tour="danger-zone">
            <DangerZone
              canDelete={sub.status === "cancelled"}
              busy={busy === "delete"}
              onDelete={() => setConfirmDelete(true)}
            />
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => {
          void doCancel();
        }}
        title="Atšaukti prenumeratą?"
        message={
          sub?.status === "trialing"
            ? "Prenumerata bus atšaukta iš karto. Klubas nebeveiks vartotojams."
            : `Prenumerata bus atšaukta ${formatDate(sub?.currentPeriodEnd ?? null)}. Iki tol klubas veiks kaip įprasta.`
        }
        confirmLabel="Taip, atšaukti"
        destructive
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          void doDelete();
        }}
        title={`Ištrinti klubą „${clubName}"?`}
        message="Bus visam laikui ištrinti klubo nariai, treneriai, treniruotės, planai, rezultatai ir prisijungimo paskyros. Šio veiksmo atšaukti nebus galima."
        confirmLabel="Taip, ištrinti visam laikui"
        destructive
      />
    </div>
  );
}

function DangerZone({
  canDelete,
  busy,
  onDelete,
}: {
  canDelete: boolean;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/60 p-5 dark:border-red-500/30 dark:bg-red-500/5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-bold text-red-900 dark:text-red-200">
            Pavojinga zona
          </h2>
          <p className="mt-1 text-sm text-red-800/80 dark:text-red-200/70">
            Ištrinkite klubą visam laikui — bus pašalinti visi nariai,
            treneriai, treniruotės ir rezultatai. Klubą galima ištrinti tik
            atšaukus prenumeratą.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onDelete}
              disabled={!canDelete || busy}
              className="btn-danger disabled:opacity-40"
              title={
                canDelete
                  ? undefined
                  : "Pirmiausia atšaukite prenumeratą."
              }
            >
              <Trash2 className="h-4 w-4" />
              {busy ? "Trinama…" : "Ištrinti klubą visam laikui"}
            </button>
            {!canDelete && (
              <span className="text-xs text-red-800/70 dark:text-red-200/60">
                Prieš ištrindami klubą, atšaukite prenumeratą aukščiau.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SubscriptionCard({
  sub,
  busy,
  onCancel,
  onResume,
  onReactivate,
  onPayInvoice,
}: {
  sub: ClubSubscription;
  busy: "cancel" | "resume" | "reactivate" | "pay" | "delete" | null;
  onCancel: () => void;
  onResume: () => void;
  onReactivate: () => void;
  onPayInvoice: () => void;
}) {
  const trialing = sub.status === "trialing";
  const active = sub.status === "active";
  const pastDue = sub.status === "past_due";
  const cancelled = sub.status === "cancelled";
  const willCancel = sub.cancelAtPeriodEnd && !cancelled;

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`chip ${STATUS_CLASS[sub.status]}`}
              aria-label="prenumeratos būsena"
            >
              {STATUS_LABEL[sub.status]}
            </span>
            {willCancel && (
              <span className="chip bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                Bus atšaukta
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-ink-50">
            {formatMoney(sub.monthlyFee, sub.currency)}{" "}
            <span className="text-base font-normal text-ink-500">/ mėn.</span>
          </h2>
          {trialing && (
            <>
              <p className="mt-1 text-sm text-ink-500">
                Bandomasis laikotarpis iki{" "}
                <strong className="text-ink-800 dark:text-ink-100">
                  {formatDate(sub.trialEndsAt)}
                </strong>
              </p>
              <p className="mt-0.5 text-sm text-ink-500">
                Pirmasis mokėjimas —{" "}
                <strong className="text-ink-800 dark:text-ink-100">
                  {formatDate(sub.currentPeriodEnd)}
                </strong>{" "}
                ({formatMoney(sub.monthlyFee, sub.currency)})
              </p>
            </>
          )}
          {active && !willCancel && (
            <p className="mt-1 text-sm text-ink-500">
              Kitas mokėjimas —{" "}
              <strong className="text-ink-800 dark:text-ink-100">
                {formatDate(sub.currentPeriodEnd)}
              </strong>{" "}
              ({formatMoney(sub.monthlyFee, sub.currency)})
            </p>
          )}
          {willCancel && (
            <p className="mt-1 text-sm text-ink-500">
              Prenumerata bus atšaukta{" "}
              <strong className="text-ink-800 dark:text-ink-100">
                {formatDate(sub.currentPeriodEnd)}
              </strong>
            </p>
          )}
          {pastDue && (
            <p className="mt-1 flex items-center gap-1 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              Nepavyko nurašyti mokėjimo. Klubas suspenduotas.
            </p>
          )}
          {cancelled && (
            <p className="mt-1 flex items-center gap-1 text-sm text-ink-500">
              <Ban className="h-4 w-4" />
              Atšaukta {formatDate(sub.cancelledAt)}
            </p>
          )}
        </div>

        {sub.card && (
          <div className="rounded-xl border border-ink-100 bg-ink-50/60 px-4 py-3 text-right dark:border-ink-800 dark:bg-ink-900/60">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
              Kortelė
            </div>
            <div className="mt-0.5 font-mono text-sm text-ink-900 dark:text-ink-100">
              {sub.card.brand?.toUpperCase() ?? "Kortelė"} •••• {sub.card.last4}
            </div>
            {sub.card.expMonth && sub.card.expYear && (
              <div className="text-xs text-ink-500">
                Galioja {String(sub.card.expMonth).padStart(2, "0")}/
                {sub.card.expYear}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="mt-5 flex flex-wrap gap-2 border-t border-ink-100 pt-4 dark:border-ink-800"
        data-tour="subscription-actions"
      >
        {pastDue && (
          <button
            type="button"
            onClick={onPayInvoice}
            disabled={busy !== null}
            className="btn-primary"
          >
            <ExternalLink className="h-4 w-4" />
            {busy === "pay" ? "Kraunama…" : "Apmokėti sąskaitą"}
          </button>
        )}
        {cancelled && (
          <button
            type="button"
            onClick={onReactivate}
            disabled={busy !== null}
            className="btn-primary"
          >
            <Sparkles className="h-4 w-4" />
            {busy === "reactivate" ? "Kuriama…" : "Atnaujinti prenumeratą"}
          </button>
        )}
        {willCancel && (
          <button
            type="button"
            onClick={onResume}
            disabled={busy !== null}
            className="btn-primary"
          >
            <RotateCcw className="h-4 w-4" />
            {busy === "resume" ? "Kraunama…" : "Nebeatšaukti"}
          </button>
        )}
        {(trialing || (active && !willCancel)) && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy !== null}
            className="btn-danger"
          >
            <Ban className="h-4 w-4" />
            {busy === "cancel" ? "Atšaukiama…" : "Atšaukti prenumeratą"}
          </button>
        )}
      </div>
    </section>
  );
}

function PaymentsTable({ payments }: { payments: SubscriptionPayment[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Nr.</th>
            <th className="px-4 py-3">Suma</th>
            <th className="px-4 py-3">Būsena</th>
            <th className="px-4 py-3 text-right">Sąskaita</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
          {payments.map((p) => {
            const label = p.status ? INVOICE_STATUS_LABEL[p.status] ?? p.status : "—";
            const paid = p.status === "paid";
            return (
              <tr key={p.id}>
                <td className="px-4 py-3 text-ink-900 dark:text-ink-100">
                  {formatDate(p.paidAt ?? p.created)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-500">
                  {p.number ?? "—"}
                </td>
                <td className="px-4 py-3 font-semibold text-ink-900 dark:text-ink-100">
                  {formatMoney(p.amount, p.currency)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`chip ${
                      paid
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"
                        : p.status === "open"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
                          : "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200"
                    }`}
                  >
                    {paid && <CheckCircle2 className="h-3 w-3" />}
                    {label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {p.hostedInvoiceUrl && (
                    <a
                      href={p.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700 hover:text-ink-900 dark:text-ink-200 dark:hover:text-lime-300"
                    >
                      Peržiūrėti <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
