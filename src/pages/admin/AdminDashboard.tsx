import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck2, CreditCard, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "../../store/useStore";
import { PageTitle } from "../../components/layout/PageTitle";
import { DashboardMetricCard } from "../../components/dashboard/DashboardMetricCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Avatar } from "../../components/ui/Avatar";
import { formatDateShort, todayIso } from "../../utils/dates";
import { formatCurrency } from "../../utils/format";
import {
  fetchClubPaymentsApi,
  type ClubPaymentsResponse,
} from "../../api/endpoints";

export default function AdminDashboard() {
  const authUser = useStore((s) => s.authUser);
  const trainings = useStore((s) => s.trainingSessions);
  const members = useStore((s) => s.members);
  const membershipPlans = useStore((s) => s.membershipPlans);

  const today = todayIso();
  const todaysSessions = trainings.filter((t) => t.date === today);
  const todayRegistrations = todaysSessions.reduce(
    (s, t) => s + t.registrations.length,
    0,
  );
  const overdue = members.filter((m) => m.paymentStatus === "overdue");

  const registrationTrend = Array.from({ length: 7 }, (_, i) => {
    const dayCount = trainings
      .filter(
        (t) =>
          t.date ===
          todayIso(new Date(new Date().getTime() - (6 - i) * 86400000)),
      )
      .reduce((s, t) => s + t.registrations.length, 0);
    return {
      day: `D-${6 - i}`,
      registrations: dayCount + (i === 6 ? todayRegistrations : 0),
    };
  });

  const [payments, setPayments] = useState<ClubPaymentsResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchClubPaymentsApi()
      .then((resp) => {
        if (!cancelled) setPayments(resp);
      })
      .catch(() => {
        if (!cancelled) setPayments(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyRevenue = payments?.mtdRevenue ?? 0;
  const expectedRevenue = members.reduce((s, m) => {
    const plan = membershipPlans.find((p) => p.id === m.membershipPlanId);
    if (!plan || plan.planType !== "monthly") return s;
    return s + plan.monthlyFee;
  }, 0);
  const completion = Math.round(
    (monthlyRevenue / Math.max(expectedRevenue, 1)) * 100,
  );

  const adminName = authUser?.name ?? "";
  return (
    <div>
      <PageTitle
        eyebrow={adminName ? `Sveiki sugrįžę, ${adminName}` : "Sveiki sugrįžę"}
        title="Klubo skydelis"
        description="Visos klubo veiklos apžvalga vienoje vietoje."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <DashboardMetricCard
          icon={CalendarCheck2}
          label="Šiandienos treniruotės"
          value={String(todaysSessions.length)}
          tone="accent"
        />
        <DashboardMetricCard
          icon={Users}
          label="Šiandienos registracijos"
          value={String(todayRegistrations)}
          tone="info"
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <section className="surface p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Savaitės registracijos
              </p>
              <h2 className="font-display text-lg font-bold">
                Paskutinių 7 dienų tendencija
              </h2>
            </div>
            <StatusBadge tone="accent" dot>
              Tiesiogiai
            </StatusBadge>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart
                data={registrationTrend}
                margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9ae819" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#9ae819" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.08)",
                    fontSize: 12,
                  }}
                />
                <Area
                  dataKey="registrations"
                  type="monotone"
                  stroke="#5da004"
                  strokeWidth={2}
                  fill="url(#lg)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Mėnesio pajamos
          </p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {formatCurrency(monthlyRevenue)}
          </p>
          <p className="text-sm text-ink-500">
            iš {formatCurrency(expectedRevenue)} tikėtinų
          </p>
          <div className="mt-3 rounded-2xl bg-lime-50 p-3 dark:bg-lime-400/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-lime-800 dark:text-lime-300">
              Užbaigtumas
            </p>
            <p className="font-display text-xl font-bold text-lime-900 dark:text-lime-200">
              {completion}%
            </p>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Apmokėta</span>
              <span className="font-semibold">
                {members.filter((m) => m.paymentStatus === "paid").length}
              </span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Vėluoja</span>
              <span className="font-semibold">{overdue.length}</span>
            </div>
          </div>
          <Link to="/admin/payments" className="btn-ghost mt-3 w-full">
            <CreditCard className="h-4 w-4" /> Peržiūrėti mokėjimus
          </Link>
        </section>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">
            Šiandienos treniruotės
          </h2>
          {todaysSessions.length === 0 ? (
            <p className="text-sm text-ink-500">
              Šiandien treniruočių nesuplanuota.
            </p>
          ) : (
            <ul className="space-y-2">
              {todaysSessions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 p-3 dark:border-ink-800"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      {t.startTime}–{t.endTime}
                    </p>
                    <p className="truncate text-sm font-semibold">{t.title}</p>
                    <p className="truncate text-xs text-ink-500">
                      {t.location}
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      t.registrations.length >= t.capacity
                        ? "danger"
                        : t.registrations.length >= t.capacity * 0.9
                          ? "warning"
                          : "success"
                    }
                  >
                    {t.registrations.length}/{t.capacity}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">
            Reikia dėmesio dėl mokėjimų
          </h2>
          {overdue.length === 0 ? (
            <p className="text-sm text-ink-500">Visi nariai atsiskaitę. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {overdue.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 p-3 dark:border-red-500/30 dark:bg-red-500/10"
                >
                  <Avatar name={m.name} color={m.avatarColor} size="sm" photoUrl={m.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      Vėluoja nuo {formatDateShort(m.paymentDueDate)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
