import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  Flame,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore, useCurrentMember } from '../../store/useStore';
import { PaymentStatusBanner } from '../../components/payments/PaymentStatusBanner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatCurrency, formatResult } from '../../utils/format';
import { relativeDay, todayIso, formatDateShort } from '../../utils/dates';
import { Avatar } from '../../components/ui/Avatar';

export default function MemberHome() {
  const member = useCurrentMember();
  const trainings = useStore((s) => s.trainingSessions);
  const plans = useStore((s) => s.trainingPlans);
  const categories = useStore((s) => s.leaderboardCategories);
  const results = useStore((s) => s.leaderboardResults);
  const membershipPlans = useStore((s) => s.membershipPlans);
  const plan = membershipPlans.find((p) => p.id === member.membershipPlanId);

  const today = todayIso();
  const upcoming = trainings
    .filter((t) => t.date >= today && t.status !== 'cancelled')
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const next = upcoming.find((t) => t.registrations.some((r) => r.memberId === member.id)) ?? upcoming[0];

  const publishedPlan = plans.find(
    (p) => p.memberId === member.id && p.status === 'published' && p.trainingSessionId === next?.id,
  );

  const cat100 = categories.find((c) => c.id === 'lb-100');
  const my100 = cat100
    ? results
        .filter((r) => r.categoryId === cat100.id)
        .sort((a, b) => (cat100.lowerIsBetter ? a.value - b.value : b.value - a.value))
    : [];
  const myBestIndex = my100.findIndex((r) => r.memberId === member.id);
  const myBest = myBestIndex >= 0 ? my100[myBestIndex] : undefined;

  const weeklyData = [
    { day: 'Mon', km: 4.2 },
    { day: 'Tue', km: 6.1 },
    { day: 'Wed', km: 0 },
    { day: 'Thu', km: 5.0 },
    { day: 'Fri', km: 3.1 },
    { day: 'Sat', km: 0 },
    { day: 'Sun', km: 0 },
  ];
  const weeklyKm = weeklyData.reduce((s, d) => s + d.km, 0);
  const weeklySessions = 3;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="hero-gradient rounded-3xl p-5 text-white shadow-pop">
        <div className="flex items-center gap-3">
          <Avatar name={member.name} color={member.avatarColor} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-lime-300">
              Hello, {member.name.split(' ')[0]}
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Ready to move today?
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {plan?.name ?? 'Running Club'} · {formatCurrency(plan?.monthlyFee ?? 49)}/month
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Distance this week</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums">{weeklyKm.toFixed(1)}<span className="text-sm font-medium text-white/70"> km</span></p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Sessions</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums">{weeklySessions}<span className="text-sm font-medium text-white/70"> / 5</span></p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">100 m rank</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums">
              {myBestIndex >= 0 ? `#${myBestIndex + 1}` : '—'}
            </p>
          </div>
        </div>

        <div className="mt-4 h-24 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{
                  background: '#0b0e18',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  fontSize: 12,
                  color: '#fff',
                }}
                formatter={(v: number) => [`${v.toFixed(1)} km`, 'Distance']}
              />
              <Bar dataKey="km" radius={[6, 6, 2, 2]} fill="#9ae819" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Payment status */}
      <PaymentStatusBanner
        status={member.paymentStatus}
        amount={formatCurrency(plan?.monthlyFee ?? 49)}
        dueDate={formatDateShort(member.paymentDueDate)}
        actionLabel={member.paymentStatus === 'overdue' ? 'Pay now — prototype' : 'View payments'}
        onAction={() => (window.location.href = '/member/payments')}
      />

      {/* Next training */}
      {next && (
        <section className="surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
                <CalendarCheck2 className="h-4 w-4" />
              </span>
              <h2 className="font-display text-base font-bold">Next training</h2>
            </div>
            {next.registrations.some((r) => r.memberId === member.id) ? (
              <StatusBadge tone="accent" dot>Registered</StatusBadge>
            ) : (
              <StatusBadge tone="warning" dot>Not registered</StatusBadge>
            )}
          </div>
          <Link
            to={`/member/trainings/${next.id}`}
            className="flex items-start gap-3 rounded-2xl border border-ink-100 p-3 hover:border-ink-300 dark:border-ink-800 dark:hover:border-ink-600"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-200">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {relativeDay(next.date)} · {next.startTime}–{next.endTime}
              </p>
              <p className="text-base font-semibold text-ink-900 dark:text-ink-50">{next.title}</p>
              <p className="text-xs text-ink-500">{next.location}</p>
            </div>
            <ArrowRight className="mt-3 h-4 w-4 text-ink-400" />
          </Link>
        </section>
      )}

      {/* Today's plan preview */}
      {publishedPlan && (
        <section className="surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
                <Target className="h-4 w-4" />
              </span>
              <h2 className="font-display text-base font-bold">Today&apos;s plan</h2>
            </div>
            <Link to="/member/plan" className="text-xs font-semibold text-ink-600 hover:text-ink-900 dark:text-ink-300">
              Open plan →
            </Link>
          </div>
          <p className="mb-2 text-sm font-semibold">{publishedPlan.title}</p>
          <ul className="space-y-1.5">
            {publishedPlan.exercises.slice(0, 3).map((ex) => (
              <li key={ex.id} className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-lime-500" />
                <span>
                  <span className="font-semibold text-ink-900 dark:text-ink-50">{ex.title} — </span>
                  {ex.detail}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-xl bg-ink-50 p-3 text-sm italic text-ink-700 dark:bg-ink-800/60 dark:text-ink-200">
            “{publishedPlan.coachNote}”
          </p>
        </section>
      )}

      {/* Personal best */}
      {myBest && cat100 && (
        <section className="surface p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-200">
              <Flame className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Personal best · 100 m</p>
              <p className="font-display text-2xl font-bold tabular-nums text-ink-900 dark:text-ink-50">
                {formatResult(myBest.value, cat100)}
              </p>
            </div>
            <Link
              to={`/member/leaderboards/${cat100.id}`}
              className="btn-ghost h-9 px-3 text-xs"
            >
              View leaderboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3">
        <Link to="/member/trainings" className="surface flex items-center gap-3 p-4 hover:shadow-card">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
            <CalendarCheck2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Browse trainings</p>
            <p className="text-xs text-ink-500">{upcoming.length} upcoming</p>
          </div>
        </Link>
        <Link to="/member/leaderboards" className="surface flex items-center gap-3 p-4 hover:shadow-card">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
            <Trophy className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Leaderboards</p>
            <p className="text-xs text-ink-500">{categories.length} events</p>
          </div>
        </Link>
        <Link to="/member/plan" className="surface flex items-center gap-3 p-4 hover:shadow-card">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">My plan</p>
            <p className="text-xs text-ink-500">Coach guided</p>
          </div>
        </Link>
        <Link to="/member/profile" className="surface flex items-center gap-3 p-4 hover:shadow-card">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
            <Target className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Profile</p>
            <p className="text-xs text-ink-500">Preferences</p>
          </div>
        </Link>
      </section>
    </div>
  );
}
