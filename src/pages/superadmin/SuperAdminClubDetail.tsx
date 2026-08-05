import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  Trash2,
  Users,
  UserCog,
  Euro,
  CreditCard,
  Wallet,
  Receipt,
  ExternalLink,
  LogIn,
} from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FilterChip } from "../../components/ui/FilterChip";
import { ApiError } from "../../api/client";
import {
  deleteClubApi,
  fetchSuperAdminClub,
  fetchSuperAdminClubFinances,
  impersonateUserApi,
} from "../../api/superadmin";
import { useStore } from "../../store/useStore";
import { formatCurrency } from "../../utils/format";
import type {
  ClubDetail,
  ClubFinances,
  FinancePayment,
  FinanceTotals,
  PaymentStatus,
} from "../../types";

const currency = (n: number) => `${n.toFixed(2)} €`;

const MONTH_NAMES_LT = [
  "Sausis",
  "Vasaris",
  "Kovas",
  "Balandis",
  "Gegužė",
  "Birželis",
  "Liepa",
  "Rugpjūtis",
  "Rugsėjis",
  "Spalis",
  "Lapkritis",
  "Gruodis",
];

function buildMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 24; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTH_NAMES_LT[d.getMonth()]} ${d.getFullYear()}`;
    opts.push({ value, label });
  }
  return opts;
}

function formatPaidAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("lt-LT");
  } catch {
    return iso.slice(0, 10);
  }
}

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

function FinanceKpi({
  label,
  amount,
  currency,
  tone,
  hint,
}: {
  label: string;
  amount: number;
  currency: string;
  tone?: "default" | "muted" | "danger" | "positive";
  hint?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "positive"
        ? "text-lime-700 dark:text-lime-300"
        : tone === "muted"
          ? "text-ink-500"
          : "text-ink-950 dark:text-ink-50";
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold tabular-nums ${toneClass}`}>
        {formatCurrency(amount, currency)}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-ink-500">{hint}</p>}
    </div>
  );
}

function FinancePaymentsTable({
  list,
  currency,
  showMember,
  showAppFee,
}: {
  list: FinancePayment[];
  currency: string;
  showMember: boolean;
  showAppFee: boolean;
}) {
  if (list.length === 0) {
    return <p className="p-4 text-sm text-ink-500">Mokėjimų nėra.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <th className="px-4 py-2 font-semibold">Data</th>
            {showMember && <th className="px-4 py-2 font-semibold">Narys</th>}
            <th className="px-4 py-2 font-semibold text-right">Bruto</th>
            <th className="px-4 py-2 font-semibold text-right">Stripe</th>
            {showAppFee && (
              <th className="px-4 py-2 font-semibold text-right">Mūsų dalis</th>
            )}
            <th className="px-4 py-2 font-semibold text-right">Mokesčiai</th>
            <th className="px-4 py-2 font-semibold text-right">
              {showAppFee ? "Klubui" : "Mums"}
            </th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
          {list.map((p) => (
            <tr key={p.id}>
              <td className="whitespace-nowrap px-4 py-2 text-ink-700 dark:text-ink-200">
                {formatPaidAt(p.paidAt)}
              </td>
              {showMember && (
                <td className="px-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-ink-900 dark:text-ink-50">
                      {p.memberName ?? (p.number ?? "—")}
                    </p>
                    {p.memberEmail && (
                      <p className="truncate text-xs text-ink-500">{p.memberEmail}</p>
                    )}
                    {p.kind === "credits" && (
                      <StatusBadge tone="info" dot>
                        Kreditai
                      </StatusBadge>
                    )}
                  </div>
                </td>
              )}
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                {formatCurrency(p.gross, currency)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                −{formatCurrency(p.stripeFee, currency)}
              </td>
              {showAppFee && (
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-lime-700 dark:text-lime-300">
                  {formatCurrency(p.applicationFee, currency)}
                </td>
              )}
              <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-ink-500">
                {formatCurrency(p.tax, currency)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums">
                {formatCurrency(p.net, currency)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right">
                {p.hostedInvoiceUrl ? (
                  <a
                    className="inline-flex items-center gap-1 text-xs text-lime-700 hover:underline dark:text-lime-300"
                    href={p.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Sąskaita
                  </a>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LoginAsButton({
  onClick,
  loading,
  disabled,
  disabledTitle,
}: {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1 rounded-full border border-ink-200 px-2.5 text-xs font-semibold text-ink-700 hover:border-ink-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-700 dark:text-ink-200 dark:hover:border-ink-500"
      onClick={onClick}
      disabled={disabled || loading}
      title={disabled ? disabledTitle : "Prisijungti kaip šis vartotojas"}
    >
      <LogIn className="h-3 w-3" />
      {loading ? "…" : "Prisijungti kaip"}
    </button>
  );
}

function FinanceSection({
  title,
  icon: Icon,
  totals,
  list,
  currency,
  showMember,
  showAppFee,
  defaultExpanded = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  totals: FinanceTotals;
  list: FinancePayment[];
  currency: string;
  showMember: boolean;
  showAppFee: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <section className="surface">
      <header className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-ink-500" />
          <h2 className="font-display text-base font-bold text-ink-950 dark:text-ink-50">
            {title}
          </h2>
          <span className="text-xs text-ink-500">
            {totals.count} {totals.count === 1 ? "mokėjimas" : "mokėjimai"}
          </span>
        </div>
        <button
          type="button"
          className="text-xs text-ink-500 hover:text-ink-800 dark:hover:text-ink-100"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Slėpti" : "Rodyti sąrašą"}
        </button>
      </header>
      <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-5">
        <FinanceKpi label="Bruto" amount={totals.gross} currency={currency} />
        <FinanceKpi
          label="Stripe mokestis"
          amount={totals.stripeFee}
          currency={currency}
          tone="danger"
        />
        {showAppFee && (
          <FinanceKpi
            label="Mūsų dalis"
            amount={totals.applicationFee}
            currency={currency}
            tone="positive"
            hint="Application fee"
          />
        )}
        <FinanceKpi
          label="Mokesčiai (VAT)"
          amount={totals.tax}
          currency={currency}
          tone="muted"
        />
        <FinanceKpi
          label={showAppFee ? "Klubui gryna" : "Mums gryna"}
          amount={totals.net}
          currency={currency}
          tone="positive"
        />
      </div>
      {expanded && (
        <div className="border-t border-ink-100 dark:border-ink-800">
          <FinancePaymentsTable
            list={list}
            currency={currency}
            showMember={showMember}
            showAppFee={showAppFee}
          />
        </div>
      )}
    </section>
  );
}

export default function SuperAdminClubDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const push = useStore((s) => s.pushToast);

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // "" = all time; otherwise "YYYY-MM".
  const [month, setMonth] = useState<string>("");
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [finances, setFinances] = useState<ClubFinances | null>(null);
  const [financesLoading, setFinancesLoading] = useState(false);
  const [financesError, setFinancesError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!id) return;
    setFinancesLoading(true);
    setFinancesError(null);
    fetchSuperAdminClubFinances(id, month || null)
      .then(setFinances)
      .catch((err) =>
        setFinancesError(
          err instanceof ApiError ? err.message : "Nepavyko įkelti finansų.",
        ),
      )
      .finally(() => setFinancesLoading(false));
  }, [id, month]);

  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(
    null,
  );

  const handleImpersonate = async (userId: string) => {
    setImpersonatingUserId(userId);
    try {
      const { token } = await impersonateUserApi(userId);
      // ?imp=1 tells the new tab's store to persist to sessionStorage instead
      // of localStorage, so the super-admin session in the current tab is
      // untouched. The landing page reads the token, strips it from the URL,
      // and forwards to the target's home dashboard.
      const url = `/impersonate?imp=1&token=${encodeURIComponent(token)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "Nepavyko prisijungti kaip vartotojas.",
      });
    } finally {
      setImpersonatingUserId(null);
    }
  };

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
        <StatCard
          label="Mūsų pelnas"
          value={currency(club.platformEarnings)}
          icon={Euro}
        />
      </div>

      <section className="surface mb-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-4 py-3 dark:border-ink-800">
          <div>
            <h2 className="font-display text-base font-bold text-ink-950 dark:text-ink-50">
              Finansai
            </h2>
            <p className="text-xs text-ink-500">
              {month
                ? monthOptions.find((o) => o.value === month)?.label ?? month
                : "Visą laiką"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={month === ""} onClick={() => setMonth("")}>
              Visą laiką
            </FilterChip>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 rounded-full border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
            >
              <option value="">Pasirinkti mėnesį…</option>
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </header>
        <div className="p-4">
          {financesError && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {financesError}
            </div>
          )}
          {financesLoading && !finances ? (
            <p className="text-sm text-ink-500">Kraunama…</p>
          ) : finances ? (
            <div className="grid gap-4">
              <FinanceSection
                title="Narių mokėjimai"
                icon={Wallet}
                totals={finances.memberPayments.totals}
                list={finances.memberPayments.list}
                currency={finances.memberPayments.currency}
                showMember
                showAppFee
                defaultExpanded
              />
              <FinanceSection
                title="Klubo prenumerata (SportApp)"
                icon={Receipt}
                totals={finances.clubSubscription.totals}
                list={finances.clubSubscription.list}
                currency={finances.clubSubscription.currency}
                showMember={false}
                showAppFee={false}
              />
            </div>
          ) : null}
        </div>
      </section>

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
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                    {a.name ?? "—"}
                  </p>
                  <p className="truncate text-xs text-ink-500">{a.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge tone="accent" dot>
                    Admin
                  </StatusBadge>
                  <LoginAsButton
                    onClick={() => handleImpersonate(a.id)}
                    loading={impersonatingUserId === a.id}
                  />
                </div>
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
                  <LoginAsButton
                    onClick={() => m.userId && handleImpersonate(m.userId)}
                    loading={
                      m.userId !== null && impersonatingUserId === m.userId
                    }
                    disabled={!m.userId}
                    disabledTitle="Šis narys neturi prisijungimo paskyros"
                  />
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
                  <LoginAsButton
                    onClick={() => c.userId && handleImpersonate(c.userId)}
                    loading={
                      c.userId !== null && impersonatingUserId === c.userId
                    }
                    disabled={!c.userId}
                    disabledTitle="Šis treneris neturi prisijungimo paskyros"
                  />
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
