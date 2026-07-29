import { useEffect, useRef, useState } from "react";
import {
  Check,
  Clock,
  CreditCard,
  Infinity as InfinityIcon,
  Plus,
  RefreshCw,
  Ticket,
  Trash2,
} from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { FormField } from "../../components/ui/FormField";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useStore } from "../../store/useStore";
import { formatCurrency } from "../../utils/format";
import { api } from "../../api/client";
import type { MembershipPlan, PlanType } from "../../types";

export default function AdminPlans() {
  const plans = useStore((s) => s.membershipPlans);
  const addMembershipPlan = useStore((s) => s.addMembershipPlan);
  const removeMembershipPlan = useStore((s) => s.removeMembershipPlan);
  const push = useStore((s) => s.pushToast);
  const [syncing, setSyncing] = useState(false);

  const needsSync = plans.some((p) => !p.stripePriceId && p.monthlyFee > 0);

  const sync = async (silent = false) => {
    setSyncing(true);
    try {
      const updated = await api.post<MembershipPlan[]>(
        "/membership-plans/sync",
      );
      useStore.setState({ membershipPlans: updated });
      if (!silent) {
        push({ kind: "success", message: "Planai sinchronizuoti su Stripe." });
      }
    } catch (err) {
      if (!silent) {
        push({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Nepavyko sinchronizuoti.",
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync once on mount if any plan is missing a Stripe Price — this
  // covers the common case where a plan was created before the club finished
  // Stripe Connect onboarding. Silent so success/failure doesn't spam a toast.
  const autoTriedRef = useRef(false);
  useEffect(() => {
    if (autoTriedRef.current) return;
    if (!needsSync) return;
    autoTriedRef.current = true;
    void sync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsSync]);

  const [planType, setPlanType] = useState<PlanType>("monthly");
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [unlimited, setUnlimited] = useState(true);
  const [trainingsPerWeek, setTrainingsPerWeek] = useState("3");
  const [creditCount, setCreditCount] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState<MembershipPlan | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const monthlyFee = Number(fee);
    if (!name.trim()) {
      setError("Įveskite plano pavadinimą.");
      return;
    }
    if (!Number.isFinite(monthlyFee) || monthlyFee < 0) {
      setError("Įveskite teisingą kainą.");
      return;
    }
    let cap: number | null = null;
    let credits: number | null = null;
    if (planType === "credits") {
      credits = Number(creditCount);
      if (!Number.isInteger(credits) || credits < 1 || credits > 999) {
        setError("Kreditų kiekis turi būti sveikas skaičius nuo 1 iki 999.");
        return;
      }
    } else if (!unlimited) {
      cap = Number(trainingsPerWeek);
      if (!Number.isInteger(cap) || cap < 1 || cap > 10) {
        setError(
          "Treniruočių per savaitę limitas turi būti sveikas skaičius nuo 1 iki 10.",
        );
        return;
      }
    }
    setSubmitting(true);
    const res = await addMembershipPlan({
      name: name.trim(),
      monthlyFee,
      currency: currency.trim() || "EUR",
      planType,
      creditCount: credits,
      trainingsPerWeek: cap,
    });
    setSubmitting(false);
    if (res.ok) {
      push({ kind: "success", message: "Narystės planas sukurtas." });
      setName("");
      setFee("");
      setCurrency("EUR");
      setUnlimited(true);
      setTrainingsPerWeek("3");
      setCreditCount("5");
      setPlanType("monthly");
    } else {
      setError(res.error ?? "Nepavyko sukurti plano.");
    }
  };

  const priceLabel = planType === "credits" ? "Paketo kaina" : "Kaina / mėn.";

  return (
    <div className="max-w-3xl">
      <PageTitle
        eyebrow="Administratorius"
        title="Narystės planai"
        description="Kurkite mėnesinius planus arba treniruočių paketus (nuperkate kartą, gaunate iš anksto nustatytą kiekį treniruočių)."
      />

      <section className="surface mb-4 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
          <Plus className="h-4 w-4 text-ink-500" /> Naujas planas
        </h2>

        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="label">Plano tipas</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPlanType("monthly")}
                className={
                  "flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors " +
                  (planType === "monthly"
                    ? "border-ink-900 bg-ink-900/5 dark:border-lime-400 dark:bg-lime-400/10"
                    : "border-ink-200 hover:border-ink-400 dark:border-ink-700")
                }
              >
                <CreditCard className="mt-0.5 h-4 w-4 text-ink-600 dark:text-ink-300" />
                <div>
                  <p className="text-sm font-semibold">Mėnesinis</p>
                  <p className="text-xs text-ink-500">
                    Automatinis atsiskaitymas kas mėnesį.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPlanType("credits")}
                className={
                  "flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors " +
                  (planType === "credits"
                    ? "border-ink-900 bg-ink-900/5 dark:border-lime-400 dark:bg-lime-400/10"
                    : "border-ink-200 hover:border-ink-400 dark:border-ink-700")
                }
              >
                <Ticket className="mt-0.5 h-4 w-4 text-ink-600 dark:text-ink-300" />
                <div>
                  <p className="text-sm font-semibold">Treniruočių paketas</p>
                  <p className="text-xs text-ink-500">
                    Vienkartinis mokėjimas už N treniruočių.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_160px_120px]">
            <FormField
              label="Pavadinimas"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                planType === "credits"
                  ? "pvz. 5 treniruočių paketas"
                  : "pvz. Neribotas bėgimo klubas"
              }
            />
            <FormField
              label={priceLabel}
              required
              type="number"
              min="0"
              step="0.01"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="49"
            />
            <FormField
              label="Valiuta"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="EUR"
            />
          </div>

          {planType === "credits" ? (
            <div>
              <label className="label">Treniruočių pakete</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="999"
                  step="1"
                  value={creditCount}
                  onChange={(e) => setCreditCount(e.target.value)}
                  className="input h-11 w-28"
                  placeholder="5"
                />
                <span className="text-xs text-ink-500">
                  Narys galės užsiregistruoti į tiek treniruočių, kiek jų yra
                  pakete. Kiekviena registracija sumažina likutį vienetu.
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="label">Treniruotės per savaitę</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-ink-900"
                    checked={unlimited}
                    onChange={(e) => setUnlimited(e.target.checked)}
                  />
                  Neribotai
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  disabled={unlimited}
                  value={trainingsPerWeek}
                  onChange={(e) => setTrainingsPerWeek(e.target.value)}
                  className="input h-11 w-28 disabled:opacity-40"
                  placeholder="3"
                />
                <span className="text-xs text-ink-500">
                  {unlimited
                    ? "Narys galės registruotis į visas treniruotes."
                    : "Nuo 1 iki 10 treniruočių savaitėje."}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Plus className="h-4 w-4" />
              {submitting ? "Kuriama…" : "Sukurti planą"}
            </button>
          </div>
        </form>
      </section>

      <section className="surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 p-4 dark:border-ink-800">
          <h2 className="flex items-center gap-2 font-display text-base font-bold">
            <CreditCard className="h-4 w-4 text-ink-500" /> Esami planai
          </h2>
          {needsSync && (
            <button
              type="button"
              onClick={() => sync()}
              disabled={syncing}
              className="btn-ghost h-9 px-3 text-xs"
              title="Iš naujo bandyti sukurti Stripe kainas"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Sinchronizuojama…" : "Sinchronizuoti su Stripe"}
            </button>
          )}
        </div>
        {plans.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">
            Planų dar nėra. Sukurkite pirmą aukščiau.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {plans.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                    {p.name}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                    <span>
                      {formatCurrency(p.monthlyFee, p.currency)}
                      {p.planType === "credits"
                        ? " · vienkartinis"
                        : " / mėn."}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {p.planType === "credits" ? (
                        <>
                          <Ticket className="h-3 w-3" />
                          {p.creditCount ?? 0} treniruotės pakete
                        </>
                      ) : p.trainingsPerWeek === null ? (
                        <>
                          <InfinityIcon className="h-3 w-3" />
                          Neribotai treniruočių / sav.
                        </>
                      ) : (
                        <>{p.trainingsPerWeek} treniruotės / sav.</>
                      )}
                    </span>
                    {p.monthlyFee > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          p.stripePriceId
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                        }`}
                        title={
                          p.stripePriceId
                            ? "Planas prijungtas prie Stripe — nariai gali mokėti"
                            : "Laukiama, kol klubas užbaigs Stripe registraciją"
                        }
                      >
                        {p.stripePriceId ? (
                          <>
                            <Check className="h-3 w-3" />
                            Stripe
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            Laukiama Stripe
                          </>
                        )}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost h-9 px-2 text-sm text-red-600"
                  onClick={() => setToDelete(p)}
                  aria-label={`Ištrinti planą ${p.name}`}
                >
                  <Trash2 className="h-4 w-4" /> Ištrinti
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            removeMembershipPlan(toDelete.id);
            push({ kind: "success", message: "Planas ištrintas." });
          }
          setToDelete(null);
        }}
        title="Ištrinti narystės planą?"
        message={
          toDelete
            ? `Planas „${toDelete.name}" bus ištrintas. Nariai, turintys šį planą, liks be plano.`
            : ""
        }
        confirmLabel="Ištrinti"
        cancelLabel="Atšaukti"
      />
    </div>
  );
}
