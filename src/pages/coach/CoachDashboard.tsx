import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  CalendarCheck2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Flame,
  Plus,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore, useCurrentCoach } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { DashboardMetricCard } from '../../components/dashboard/DashboardMetricCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Avatar } from '../../components/ui/Avatar';
import { formatDateShort, todayIso } from '../../utils/dates';
import { formatCurrency, formatResult } from '../../utils/format';

export default function CoachDashboard() {
  const coach = useCurrentCoach();
  const trainings = useStore((s) => s.trainingSessions);
  const plans = useStore((s) => s.trainingPlans);
  const members = useStore((s) => s.members);
  const results = useStore((s) => s.leaderboardResults);
  const categories = useStore((s) => s.leaderboardCategories);
  const membershipPlans = useStore((s) => s.membershipPlans);

  const today = todayIso();
  const todaysSessions = trainings.filter((t) => t.date === today);
  const todayRegistrations = todaysSessions.reduce((s, t) => s + t.registrations.length, 0);
  const closeToCapacity = trainings.filter(
    (t) => t.date >= today && t.registrations.length >= t.capacity * 0.9,
  );
  const overdue = members.filter((m) => m.paymentStatus === 'overdue');
  const plansNeeded = trainings
    .filter((t) => t.date >= today)
    .flatMap((t) => t.registrations.map((r) => ({ t, memberId: r.memberId })))
    .filter((row) => !plans.some((p) => p.trainingSessionId === row.t.id && p.memberId === row.memberId && p.status === 'published'))
    .length;

  const monthPBs = results.filter((r) => r.personalBest).length;

  const registrationTrend = Array.from({ length: 7 }, (_, i) => {
    const dayCount = trainings
      .filter((t) => t.date === todayIso(new Date(new Date().getTime() - (6 - i) * 86400000)))
      .reduce((s, t) => s + t.registrations.length, 0);
    return { day: `D-${6 - i}`, registrations: dayCount + (i === 6 ? todayRegistrations : 0) };
  });

  const monthlyRevenue = members
    .filter((m) => m.paymentStatus === 'paid')
    .reduce((s, m) => s + (membershipPlans.find((p) => p.id === m.membershipPlanId)?.monthlyFee ?? 0), 0);
  const expectedRevenue = members.reduce(
    (s, m) => s + (membershipPlans.find((p) => p.id === m.membershipPlanId)?.monthlyFee ?? 0),
    0,
  );
  const completion = Math.round((monthlyRevenue / Math.max(expectedRevenue, 1)) * 100);

  const recentPBs = results
    .filter((r) => r.personalBest)
    .slice(-4)
    .reverse();

  return (
    <div>
      <PageTitle
        eyebrow={`Welcome back, ${coach.name.replace('Coach ', '')}`}
        title="Coach dashboard"
        description="Everything the club needs from you at a glance."
        action={
          <Link to="/coach/trainings/new" className="btn-primary">
            <Plus className="h-4 w-4" /> New training
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <DashboardMetricCard icon={CalendarCheck2} label="Trainings today" value={String(todaysSessions.length)} tone="accent" />
        <DashboardMetricCard icon={Users} label="Registrations today" value={String(todayRegistrations)} tone="info" />
        <DashboardMetricCard icon={Flame} label="Close to full" value={String(closeToCapacity.length)} tone="warning" hint="Sessions ≥ 90% capacity" />
        <DashboardMetricCard icon={AlertOctagon} label="Overdue members" value={String(overdue.length)} tone="danger" />
        <DashboardMetricCard icon={ClipboardList} label="Plans to prepare" value={String(plansNeeded)} tone="neutral" />
        <DashboardMetricCard icon={Trophy} label="PBs this week" value={String(monthPBs)} tone="accent" />
      </div>

      {/* Chart + revenue */}
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <section className="surface p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Weekly registrations</p>
              <h2 className="font-display text-lg font-bold">Trend over the last 7 days</h2>
            </div>
            <StatusBadge tone="accent" dot>Live</StatusBadge>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={registrationTrend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9ae819" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#9ae819" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.08)',
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
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Monthly revenue</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {formatCurrency(monthlyRevenue)}
          </p>
          <p className="text-sm text-ink-500">of {formatCurrency(expectedRevenue)} expected</p>
          <div className="mt-3 rounded-2xl bg-lime-50 p-3 dark:bg-lime-400/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-lime-800 dark:text-lime-300">Completion</p>
            <p className="font-display text-xl font-bold text-lime-900 dark:text-lime-200">{completion}%</p>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Paid</span><span className="font-semibold">{members.filter((m) => m.paymentStatus === 'paid').length}</span></div>
            <div className="flex justify-between"><span>Due soon</span><span className="font-semibold">{members.filter((m) => m.paymentStatus === 'due_soon').length}</span></div>
            <div className="flex justify-between"><span>Processing</span><span className="font-semibold">{members.filter((m) => m.paymentStatus === 'processing').length}</span></div>
            <div className="flex justify-between text-red-600"><span>Overdue</span><span className="font-semibold">{overdue.length}</span></div>
          </div>
          <Link to="/coach/payments" className="btn-ghost mt-3 w-full">
            <CreditCard className="h-4 w-4" /> Review payments
          </Link>
        </section>
      </div>

      {/* Sessions + attention */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section className="surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Today&apos;s sessions</h2>
            <Link to="/coach/trainings" className="text-xs font-semibold text-ink-600 hover:text-ink-900 dark:text-ink-300">
              View all →
            </Link>
          </div>
          {todaysSessions.length === 0 ? (
            <p className="text-sm text-ink-500">No sessions scheduled for today.</p>
          ) : (
            <ul className="space-y-2">
              {todaysSessions.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      {t.startTime}–{t.endTime}
                    </p>
                    <p className="truncate text-sm font-semibold">{t.title}</p>
                    <p className="truncate text-xs text-ink-500">{t.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={t.registrations.length >= t.capacity ? 'danger' : t.registrations.length >= t.capacity * 0.9 ? 'warning' : 'success'}>
                      {t.registrations.length}/{t.capacity}
                    </StatusBadge>
                    <Link to={`/coach/trainings/${t.id}`} className="btn-ghost h-8 px-2 text-xs">Open</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">Payment attention list</h2>
          {overdue.length === 0 ? (
            <p className="text-sm text-ink-500">All members are up to date. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {overdue.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 p-3 dark:border-red-500/30 dark:bg-red-500/10">
                  <Avatar name={m.name} color={m.avatarColor} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      Overdue since {formatDateShort(m.paymentDueDate)}
                    </p>
                  </div>
                  <Link to={`/coach/members/${m.id}`} className="btn-ghost h-8 px-2 text-xs">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Leaderboard updates + quick actions */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section className="surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Latest personal bests</h2>
            <Link to="/coach/leaderboards" className="text-xs font-semibold text-ink-600 hover:text-ink-900 dark:text-ink-300">
              Leaderboards →
            </Link>
          </div>
          <ul className="space-y-2">
            {recentPBs.map((r) => {
              const m = members.find((x) => x.id === r.memberId);
              const c = categories.find((x) => x.id === r.categoryId);
              if (!m || !c) return null;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
                  <Avatar name={m.name} color={m.avatarColor} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-ink-500">{c.event} · {formatResult(r.value, c)}</p>
                  </div>
                  <StatusBadge tone="accent" dot>PB</StatusBadge>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">Quick actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction to="/coach/trainings/new" icon={CalendarCheck2} label="Create training" />
            <QuickAction to="/coach/leaderboards" icon={Trophy} label="Add result" />
            <QuickAction to="/coach/trainings" icon={ClipboardCheck} label="Assign plan" />
            <QuickAction to="/coach/payments" icon={CreditCard} label="Review payments" />
            <QuickAction to="/coach/members" icon={UserPlus} label="Member directory" />
            <QuickAction to="/coach/leaderboards" icon={Trophy} label="New leaderboard" />
          </div>
        </section>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-xl border border-ink-100 p-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-400 dark:border-ink-800 dark:text-ink-100 dark:hover:border-ink-600"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-100 dark:bg-ink-800">
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}
