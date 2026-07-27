import { useState } from "react";
import { CreditCard, Infinity as InfinityIcon, Plus, Trash2 } from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { FormField } from "../../components/ui/FormField";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useStore } from "../../store/useStore";
import { formatCurrency } from "../../utils/format";
import type { MembershipPlan } from "../../types";

export default function AdminPlans() {
  const plans = useStore((s) => s.membershipPlans);
  const addMembershipPlan = useStore((s) => s.addMembershipPlan);
  const removeMembershipPlan = useStore((s) => s.removeMembershipPlan);
  const push = useStore((s) => s.pushToast);

  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [unlimited, setUnlimited] = useState(true);
  const [trainingsPerWeek, setTrainingsPerWeek] = useState("3");
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
    if (!unlimited) {
      cap = Number(trainingsPerWeek);
      if (!Number.isInteger(cap) || cap < 1 || cap > 10) {
        setError("Treniruočių per savaitę limitas turi būti sveikas skaičius nuo 1 iki 10.");
        return;
      }
    }
    setSubmitting(true);
    const res = await addMembershipPlan({
      name: name.trim(),
      monthlyFee,
      currency: currency.trim() || "EUR",
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
    } else {
      setError(res.error ?? "Nepavyko sukurti plano.");
    }
  };

  return (
    <div className="max-w-3xl">
      <PageTitle
        eyebrow="Administratorius"
        title="Narystės planai"
        description="Kurkite planus ir nustatykite kainas. Planas priskiriamas nariui, o mokėjimai skaičiuojami pagal plano kainą."
      />

      <section className="surface mb-4 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
          <Plus className="h-4 w-4 text-ink-500" /> Naujas planas
        </h2>
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-[1fr_140px_120px]">
          <FormField
            label="Pavadinimas"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="pvz. Neribotas bėgimo klubas"
          />
          <FormField
            label="Kaina / mėn."
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

          <div className="sm:col-span-3">
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

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-3">
              {error}
            </div>
          )}
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Plus className="h-4 w-4" />
              {submitting ? "Kuriama…" : "Sukurti planą"}
            </button>
          </div>
        </form>
      </section>

      <section className="surface">
        <div className="border-b border-ink-100 p-4 dark:border-ink-800">
          <h2 className="flex items-center gap-2 font-display text-base font-bold">
            <CreditCard className="h-4 w-4 text-ink-500" /> Esami planai
          </h2>
        </div>
        {plans.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">Planų dar nėra. Sukurkite pirmą aukščiau.</p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {plans.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                    {p.name}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                    <span>{formatCurrency(p.monthlyFee)} / mėn.</span>
                    <span className="inline-flex items-center gap-1">
                      {p.trainingsPerWeek === null ? (
                        <>
                          <InfinityIcon className="h-3 w-3" />
                          Neribotai treniruočių / sav.
                        </>
                      ) : (
                        <>{p.trainingsPerWeek} treniruotės / sav.</>
                      )}
                    </span>
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
