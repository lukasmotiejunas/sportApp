import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, UserCog, Euro, RefreshCw } from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { ApiError } from "../../api/client";
import { fetchSuperAdminClubs, fetchSuperAdminStats } from "../../api/superadmin";
import type { ClubSummary, SuperAdminStats } from "../../types";

const currency = (n: number) => `${n.toFixed(2)} €`;

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

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchSuperAdminStats(), fetchSuperAdminClubs()])
      .then(([s, c]) => {
        setStats(s);
        setClubs(c);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Nepavyko įkelti duomenų."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <PageTitle
        eyebrow="Platforma"
        title="Klubai"
        description="Visi klubai ir jų statistika."
        action={
          <button type="button" className="btn-ghost" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Atnaujinti
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Klubai" value={String(stats?.clubs ?? 0)} icon={Building2} />
        <StatCard label="Nariai" value={String(stats?.members ?? 0)} icon={Users} />
        <StatCard label="Treneriai" value={String(stats?.coaches ?? 0)} icon={UserCog} />
        <StatCard
          label="Mūsų pelnas"
          value={currency(stats?.platformEarnings ?? 0)}
          icon={Euro}
        />
      </div>

      <section className="surface">
        <header className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
          <h2 className="font-display text-base font-bold text-ink-950 dark:text-ink-50">
            Klubai
          </h2>
          <span className="text-xs text-ink-500">{clubs.length} klubai</span>
        </header>

        {loading ? (
          <p className="p-4 text-sm text-ink-500">Kraunama…</p>
        ) : clubs.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-ink-500">Klubų dar nėra.</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {clubs.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/superadmin/clubs/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50 dark:hover:bg-ink-900"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-ink-500">/{c.slug}</p>
                  </div>
                  <div className="hidden gap-6 text-right sm:flex">
                    <div>
                      <p className="text-[10px] uppercase text-ink-500">Nariai</p>
                      <p className="text-sm font-semibold">{c.memberCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-ink-500">Treneriai</p>
                      <p className="text-sm font-semibold">{c.coachCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-ink-500">Mūsų pelnas</p>
                      <p className="text-sm font-semibold">
                        {currency(c.platformEarnings)}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
