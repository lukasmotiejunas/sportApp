import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CircleDollarSign, Search } from "lucide-react";
import { useStore } from "../../store/useStore";
import { PageTitle } from "../../components/layout/PageTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Avatar } from "../../components/ui/Avatar";
import { DashboardMetricCard } from "../../components/dashboard/DashboardMetricCard";
import { formatCurrency } from "../../utils/format";
import { formatDateShort } from "../../utils/dates";
import type { PaymentStatus } from "../../types";
import { FilterChip } from "../../components/ui/FilterChip";

const filters: { id: "all" | PaymentStatus; label: string }[] = [
  { id: "all", label: "Visi" },
  { id: "paid", label: "Apmokėta" },
  { id: "overdue", label: "Vėluoja" },
];

const paymentTone = {
  paid: "success",
  overdue: "danger",
} as const;

const paymentLabel = {
  paid: "Apmokėta",
  overdue: "Vėluoja",
} as const;

export default function CoachPayments() {
  const members = useStore((s) => s.members);
  const plans = useStore((s) => s.membershipPlans);
  const setPaymentStatus = useStore((s) => s.setPaymentStatus);
  const push = useStore((s) => s.pushToast);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | PaymentStatus>("all");

  const rows = members
    .filter((m) => (filter === "all" ? true : m.paymentStatus === filter))
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  const counts = useMemo(() => {
    return members.reduce(
      (acc, m) => {
        acc[m.paymentStatus] += 1;
        return acc;
      },
      { paid: 0, overdue: 0 } as Record<PaymentStatus, number>,
    );
  }, [members]);

  const monthlyRevenue = members
    .filter((m) => m.paymentStatus === "paid")
    .reduce(
      (s, m) =>
        s + (plans.find((p) => p.id === m.membershipPlanId)?.monthlyFee ?? 0),
      0,
    );
  const expected = members.reduce(
    (s, m) =>
      s + (plans.find((p) => p.id === m.membershipPlanId)?.monthlyFee ?? 0),
    0,
  );
  const completion = Math.round((monthlyRevenue / Math.max(expected, 1)) * 100);

  const pieData = [
    { name: "Apmokėta", value: counts.paid, color: "#10b981" },
    { name: "Vėluoja", value: counts.overdue, color: "#ef4444" },
  ];

  return (
    <div>
      <PageTitle
        eyebrow="Treneris"
        title="Mokėjimai"
        description="Simuliuojamos mokėjimų operacijos — būsenų pakeitimai iš karto atsispindi nario patirtyje."
      />

      <div className="grid grid-cols-2 gap-3">
        <DashboardMetricCard
          icon={CircleDollarSign}
          label="Apmokėta"
          value={String(counts.paid)}
          tone="accent"
        />
        <DashboardMetricCard
          icon={CircleDollarSign}
          label="Vėluoja"
          value={String(counts.overdue)}
          tone="danger"
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <section className="surface p-4 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Simuliuojamos mėnesio pajamos
          </p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {formatCurrency(monthlyRevenue)}
          </p>
          <p className="text-sm text-ink-500">
            iš {formatCurrency(expected)} tikėtinų
          </p>
          <p className="mt-2 text-sm font-semibold text-lime-700 dark:text-lime-300">
            {completion}% užbaigtumas
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
                placeholder="Ieškoti nario"
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

          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-ink-500">
                <tr>
                  <th className="py-2">Narys</th>
                  <th className="py-2">Planas</th>
                  <th className="py-2">Suma</th>
                  <th className="py-2">Būsena</th>
                  <th className="py-2 text-right">Veiksmai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {rows.map((m) => {
                  const plan = plans.find((p) => p.id === m.membershipPlanId)!;
                  return (
                    <tr key={m.id}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={m.name}
                            color={m.avatarColor}
                            size="sm"
                          />
                          <div>
                            <p className="text-sm font-semibold">{m.name}</p>
                            <p className="text-[11px] text-ink-500">
                              {m.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-ink-600 dark:text-ink-300">
                        {plan.name}
                      </td>
                      <td className="py-3 font-semibold tabular-nums">
                        {formatCurrency(plan.monthlyFee)}
                      </td>
                      <td className="py-3">
                        <StatusBadge tone={paymentTone[m.paymentStatus]} dot>
                          {paymentLabel[m.paymentStatus]}
                        </StatusBadge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/coach/members/${m.id}`}
                            className="btn-ghost h-8 px-2 text-xs"
                          >
                            Atidaryti
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <ul className="divide-y divide-ink-100 md:hidden dark:divide-ink-800">
            {rows.map((m) => {
              const plan = plans.find((p) => p.id === m.membershipPlanId)!;
              return (
                <li key={m.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={m.name} color={m.avatarColor} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold">{m.name}</p>
                      <p className="text-xs text-ink-500">
                        {plan.name} · {formatCurrency(plan.monthlyFee)}
                      </p>
                      <p className="text-xs text-ink-500">
                        Iki {formatDateShort(m.paymentDueDate)}
                      </p>
                    </div>
                    <StatusBadge tone={paymentTone[m.paymentStatus]} dot>
                      {paymentLabel[m.paymentStatus]}
                    </StatusBadge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button
                      className="btn-ghost h-8 px-2 text-xs"
                      onClick={() => {
                        setPaymentStatus(m.id, "paid");
                        push({
                          kind: "success",
                          message: `${m.name} pažymėtas kaip apmokėjęs.`,
                        });
                      }}
                      disabled={m.paymentStatus === "paid"}
                    >
                      Pažymėti kaip apmokėtą
                    </button>
                    <button
                      className="btn-ghost h-8 px-2 text-xs text-red-600"
                      onClick={() => {
                        setPaymentStatus(m.id, "overdue");
                        push({
                          kind: "warning",
                          message: `${m.name} pažymėtas kaip vėluojantis.`,
                        });
                      }}
                      disabled={m.paymentStatus === "overdue"}
                    >
                      Vėluoja
                    </button>
                    <Link
                      to={`/coach/members/${m.id}`}
                      className="btn-ghost h-8 px-2 text-xs"
                    >
                      Atidaryti
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
