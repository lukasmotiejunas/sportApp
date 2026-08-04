import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CircleDollarSign, ExternalLink, RefreshCw, Search } from "lucide-react";
import { useStore } from "../../store/useStore";
import { PageTitle } from "../../components/layout/PageTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Avatar } from "../../components/ui/Avatar";
import { ConnectSection } from "../../components/admin/ConnectSection";
import { DashboardMetricCard } from "../../components/dashboard/DashboardMetricCard";
import { formatCurrency } from "../../utils/format";
import { formatDateShort } from "../../utils/dates";
import { FilterChip } from "../../components/ui/FilterChip";
import {
  fetchClubPaymentsApi,
  syncSubscriptionFeeApi,
  type ClubPaymentInvoice,
  type ClubPaymentsResponse,
  type SyncSubscriptionFeeResponse,
} from "../../api/endpoints";
import { ApiError } from "../../api/client";

type InvoiceFilter = "all" | "paid" | "uncollectible";

const filters: { id: InvoiceFilter; label: string }[] = [
  { id: "all", label: "Visi" },
  { id: "paid", label: "Apmokėta" },
  { id: "uncollectible", label: "Nesumokėta" },
];

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

export default function AdminPayments() {
  const members = useStore((s) => s.members);
  const [data, setData] = useState<ClubPaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InvoiceFilter>("all");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<
    | { kind: "ok"; data: SyncSubscriptionFeeResponse }
    | { kind: "err"; message: string }
    | null
  >(null);

  const runSyncFee = () => {
    setSyncing(true);
    setSyncResult(null);
    syncSubscriptionFeeApi()
      .then((resp) => setSyncResult({ kind: "ok", data: resp }))
      .catch((err) =>
        setSyncResult({
          kind: "err",
          message:
            err instanceof ApiError
              ? err.message
              : "Nepavyko sinchronizuoti platformos mokesčio.",
        }),
      )
      .finally(() => setSyncing(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchClubPaymentsApi()
      .then((resp) => {
        if (!cancelled) setData(resp);
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

  const memberById = useMemo(() => {
    const map = new Map<string, (typeof members)[number]>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const rows: ClubPaymentInvoice[] = useMemo(() => {
    const list = data?.invoices ?? [];
    return list
      .filter((inv) => inv.status !== "open")
      .filter((inv) => (filter === "all" ? true : inv.status === filter))
      .filter((inv) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const local = inv.memberId
          ? memberById.get(inv.memberId)?.name.toLowerCase() ?? ""
          : "";
        return (
          (inv.memberName ?? "").toLowerCase().includes(q) ||
          (inv.memberEmail ?? "").toLowerCase().includes(q) ||
          local.includes(q) ||
          (inv.number ?? "").toLowerCase().includes(q)
        );
      });
  }, [data, filter, search, memberById]);

  const counts = useMemo(() => {
    const acc = { paid: 0, uncollectible: 0, other: 0 };
    (data?.invoices ?? []).forEach((inv) => {
      if (inv.status === "paid") acc.paid += 1;
      else if (inv.status === "uncollectible") acc.uncollectible += 1;
      else if (inv.status !== "open") acc.other += 1;
    });
    return acc;
  }, [data]);

  const pieData = [
    { name: "Apmokėta", value: counts.paid, color: "#10b981" },
    { name: "Nesumokėta", value: counts.uncollectible, color: "#ef4444" },
  ];

  const notConnected = !loading && data && !data.connected;

  return (
    <div>
      <PageTitle
        eyebrow="Administratorius"
        title="Mokėjimai"
        description="Sumos atskaičius Stripe ir platformos mokesčius — tiek klubas realiai gauna."
      />

      <ConnectSection />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-ink-50/50 p-3 text-sm dark:border-ink-800 dark:bg-ink-900/40">
        <div>
          <p className="font-semibold">
            Platformos mokestis:{" "}
            <span className="text-emerald-600 dark:text-emerald-400">
              {data ? `${data.platformFeePct}%` : "—"}
            </span>
          </p>
          <p className="text-xs text-ink-500">
            Nauja reikšmė netaikoma automatiškai jau sukurtoms Stripe
            prenumeratoms — paspauskite, kad atnaujintumėte visas.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={runSyncFee}
          disabled={syncing}
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sinchronizuojama…" : "Sinchronizuoti mokestį"}
        </button>
      </div>

      {syncResult?.kind === "ok" && (
        <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <p>
            Nustatytas platformos mokestis {syncResult.data.targetPct}%.
            Peržiūrėta {syncResult.data.scanned}, atnaujinta{" "}
            {syncResult.data.updated}, praleista {syncResult.data.skipped}
            {syncResult.data.errors.length > 0
              ? `, klaidų ${syncResult.data.errors.length}`
              : ""}
            .
          </p>
          {syncResult.data.details.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {syncResult.data.details.map((d) => (
                <li key={d.id} className="font-mono">
                  {d.id} — status: <b>{d.status}</b>, buvo:{" "}
                  {d.before ?? "null"}%, tapo: {d.after ?? "null"}% ({d.action}
                  )
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {syncResult?.kind === "err" && (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {syncResult.message}
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      {notConnected && (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Klubas dar neprijungtas prie Stripe. Užbaikite prijungimą Prenumeratos
          skyriuje, kad matytumėte realius mokėjimus.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <DashboardMetricCard
          icon={CircleDollarSign}
          label="Šio mėn. pajamos"
          value={formatCurrency(data?.mtdRevenue ?? 0)}
          tone="accent"
        />
        <DashboardMetricCard
          icon={CircleDollarSign}
          label="Šio mėn. mokėjimai"
          value={String(data?.mtdCount ?? 0)}
          tone="info"
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <section className="surface p-4 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Bendras srautas
          </p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {formatCurrency(data?.totalRevenue ?? 0)}
          </p>
          <p className="text-sm text-ink-500">
            Iš viso apmokėta iki šiol
          </p>
          <div className="mt-3 h-40">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={40}
                  outerRadius={64}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.1)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-1 grid grid-cols-2 gap-1 text-xs">
            {pieData.map((d) => (
              <li key={d.name} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: d.color }}
                />
                {d.name} <span className="text-ink-500">· {d.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface p-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                type="search"
                className="input pl-9"
                placeholder="Ieškoti nario ar sąskaitos"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Ieškoti nario"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <FilterChip
                  key={f.id}
                  active={filter === f.id}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </FilterChip>
              ))}
            </div>
          </div>

          {loading && !data ? (
            <div className="py-8 text-center text-sm text-ink-500">
              Kraunama…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-500">
              {data?.invoices.length === 0
                ? "Kol kas nėra Stripe sąskaitų."
                : "Nieko nerasta pagal filtrus."}
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="py-2">Narys</th>
                      <th className="py-2">Sąskaita</th>
                      <th className="py-2">Data</th>
                      <th className="py-2">Suma</th>
                      <th className="py-2">Būsena</th>
                      <th className="py-2 text-right">Nuoroda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                    {rows.map((inv) => {
                      const linked = inv.memberId
                        ? memberById.get(inv.memberId)
                        : undefined;
                      const displayName =
                        linked?.name ?? inv.memberName ?? "—";
                      const displayEmail =
                        linked?.email ?? inv.memberEmail ?? "";
                      const tone = invoiceTone[inv.status] ?? "info";
                      const label = invoiceLabel[inv.status] ?? inv.status;
                      return (
                        <tr key={inv.id}>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {linked ? (
                                <Avatar
                                  name={linked.name}
                                  color={linked.avatarColor}
                                  size="sm"
                                  photoUrl={linked.photoUrl}
                                />
                              ) : (
                                <div className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-xs font-semibold text-ink-500 dark:bg-ink-800">
                                  ?
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold">
                                  {displayName}
                                </p>
                                {displayEmail && (
                                  <p className="text-[11px] text-ink-500">
                                    {displayEmail}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-ink-600 dark:text-ink-300">
                            {inv.number ?? "—"}
                          </td>
                          <td className="py-3 text-ink-600 dark:text-ink-300">
                            {formatDateShort(inv.paidAt ?? inv.createdDate)}
                          </td>
                          <td className="py-3 font-semibold tabular-nums">
                            {formatCurrency(
                              inv.amount,
                              inv.currency.toUpperCase(),
                            )}
                          </td>
                          <td className="py-3">
                            <StatusBadge tone={tone} dot>
                              {label}
                            </StatusBadge>
                          </td>
                          <td className="py-3 text-right">
                            {inv.hostedInvoiceUrl && (
                              <a
                                href={inv.hostedInvoiceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-ghost inline-flex h-8 px-2 text-xs"
                                aria-label="Atidaryti sąskaitą Stripe"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-ink-100 md:hidden dark:divide-ink-800">
                {rows.map((inv) => {
                  const linked = inv.memberId
                    ? memberById.get(inv.memberId)
                    : undefined;
                  const displayName =
                    linked?.name ?? inv.memberName ?? "—";
                  const tone = invoiceTone[inv.status] ?? "info";
                  const label = invoiceLabel[inv.status] ?? inv.status;
                  return (
                    <li key={inv.id} className="py-3">
                      <div className="flex items-start gap-3">
                        {linked ? (
                          <Avatar
                            name={linked.name}
                            color={linked.avatarColor}
                            size="sm"
                            photoUrl={linked.photoUrl}
                          />
                        ) : (
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-xs font-semibold text-ink-500 dark:bg-ink-800">
                            ?
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {displayName}
                          </p>
                          <p className="text-xs text-ink-500">
                            {inv.number ?? "Sąskaita"} ·{" "}
                            {formatDateShort(inv.paidAt ?? inv.createdDate)}
                          </p>
                          <p className="text-xs text-ink-500">
                            {formatCurrency(
                              inv.amount,
                              inv.currency.toUpperCase(),
                            )}
                          </p>
                        </div>
                        <StatusBadge tone={tone} dot>
                          {label}
                        </StatusBadge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
