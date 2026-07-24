import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Trash2, Users, UserCog, Euro, CreditCard } from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ApiError } from "../../api/client";
import { deleteClubApi, fetchSuperAdminClub } from "../../api/superadmin";
import { useStore } from "../../store/useStore";
import type { ClubDetail, PaymentStatus } from "../../types";

const currency = (n: number) => `${n.toFixed(2)} €`;

const paymentTone: Record<PaymentStatus, "success" | "warning" | "danger"> = {
  paid: "success",
  pending: "warning",
  overdue: "danger",
};

const paymentLabel: Record<PaymentStatus, string> = {
  paid: "Sumokėta",
  pending: "Laukiama",
  overdue: "Vėluoja",
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
          <p className="font-display text-xl font-bold text-ink-950 dark:text-ink-50">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminClubDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const push = useStore((s) => s.pushToast);

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchSuperAdminClub(id)
      .then(setClub)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Nepavyko įkelti klubo."),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!club) return;
    const ok = window.confirm(
      `Ištrinti klubą „${club.name}"? Visi jo nariai, treneriai ir treniruotės bus prarasti.`,
    );
    if (!ok) return;
    try {
      await deleteClubApi(club.id);
      push({ kind: "success", message: "Klubas ištrintas." });
      navigate("/superadmin");
    } catch (err) {
      push({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Nepavyko ištrinti.",
      });
    }
  };

  if (loading) {
    return <p className="p-4 text-sm text-ink-500">Kraunama…</p>;
  }

  if (error || !club) {
    return (
      <div>
        <PageTitle title="Klubas" backTo="/superadmin" />
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error ?? "Klubas nerastas."}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        eyebrow="Platforma"
        title={club.name}
        description={`/${club.slug}`}
        backTo="/superadmin"
        action={
          <button type="button" className="btn-outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Ištrinti
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Nariai" value={String(club.counts.members)} icon={Users} />
        <StatCard label="Treneriai" value={String(club.counts.coaches)} icon={UserCog} />
        <StatCard label="Treniruotės" value={String(club.counts.trainingSessions)} icon={Building2} />
        <StatCard label="MRR" value={currency(club.mrr)} icon={Euro} />
      </div>

      <section className="surface mb-6">
        <header className="border-b border-ink-100 px-4 py-3 dark:border-ink-800">
          <h2 className="font-display text-base font-bold text-ink-950 dark:text-ink-50">
            Administratoriai
          </h2>
        </header>
        {club.admins.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">Administratorių nėra.</p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {club.admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">
                    {a.name ?? "—"}
                  </p>
                  <p className="text-xs text-ink-500">{a.email}</p>
                </div>
                <StatusBadge tone="accent" dot>
                  Admin
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="surface">
          <header className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
            <h2 className="font-display text-base font-bold text-ink-950 dark:text-ink-50">
              Nariai
            </h2>
            <span className="text-xs text-ink-500">{club.members.length}</span>
          </header>
          {club.members.length === 0 ? (
            <p className="p-4 text-sm text-ink-500">Narių nėra.</p>
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {club.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                      {m.name}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {m.planName ?? "Be plano"}
                      {m.monthlyFee > 0 && ` · ${currency(m.monthlyFee)}/mėn`}
                    </p>
                  </div>
                  <StatusBadge tone={paymentTone[m.paymentStatus]} dot>
                    {paymentLabel[m.paymentStatus]}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface">
          <header className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
            <h2 className="font-display text-base font-bold text-ink-950 dark:text-ink-50">
              Treneriai
            </h2>
            <span className="text-xs text-ink-500">{club.coaches.length}</span>
          </header>
          {club.coaches.length === 0 ? (
            <p className="p-4 text-sm text-ink-500">Trenerių nėra.</p>
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {club.coaches.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                    <UserCog className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                      {c.name}
                    </p>
                    {c.specialty && (
                      <p className="truncate text-xs text-ink-500">{c.specialty}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-ink-500">
        <CreditCard className="h-3.5 w-3.5" />
        {club.counts.membershipPlans} narystės planai • sukurta{" "}
        {new Date(club.createdAt).toLocaleDateString("lt-LT")}
      </div>
    </div>
  );
}
