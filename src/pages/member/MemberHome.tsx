import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useStore, useCurrentMember } from "../../store/useStore";
import { PaymentStatusBanner } from "../../components/payments/PaymentStatusBanner";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { formatCurrency } from "../../utils/format";
import {
  addDays,
  daysUntil,
  isoDate,
  relativeDay,
  todayIso,
  formatDateShort,
} from "../../utils/dates";
import { Avatar } from "../../components/ui/Avatar";
import type { TrainingSession } from "../../types";

export default function MemberHome() {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const member = useCurrentMember();
  const trainings = useStore((s) => s.trainingSessions);
  const categories = useStore((s) => s.leaderboardCategories);
  const membershipPlans = useStore((s) => s.membershipPlans);
  const refreshMyBilling = useStore((s) => s.refreshMyBilling);
  const plan = membershipPlans.find((p) => p.id === member.membershipPlanId);

  // Pull real Stripe status so the banner doesn't lie when a webhook was
  // missed between "subscription paid" and "our DB updated".
  useEffect(() => {
    void refreshMyBilling();
  }, [refreshMyBilling]);

  const today = todayIso();
  const upcoming = trainings
    .filter((t) => t.date >= today && t.status !== "cancelled")
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const next =
    upcoming.find((t) =>
      t.registrations.some((r) => r.memberId === member.id),
    ) ?? upcoming[0];

  const dayLabels = ["Pr", "An", "Tr", "Kt", "Pn", "Št", "Sk"];
  const todayDate = new Date(today + "T00:00:00");
  const daysFromMon = (todayDate.getDay() + 6) % 7;
  const mondayIso = addDays(today, -daysFromMon);
  const weeklyData = dayLabels.map((label, i) => {
    const iso = addDays(mondayIso, i);
    const sessionsOnDay = trainings.filter((t) => t.date === iso);
    const registered = sessionsOnDay.some((t) =>
      t.registrations.some((r) => r.memberId === member.id),
    );
    const isFuture = iso > today;
    const attended = registered && !isFuture;
    return {
      label,
      iso,
      attended,
      hadSession: sessionsOnDay.length > 0,
      isFuture,
      isToday: iso === today,
    };
  });
  const weeklySessions = weeklyData.filter((d) => d.attended).length;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="hero-gradient rounded-3xl p-5 text-white shadow-pop">
        <div className="flex items-center gap-3">
          <Avatar name={member.name} color={member.avatarColor} size="lg" photoUrl={member.photoUrl} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-lime-300">
              Sveiki, {member.name.split(" ")[0]}
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Pasiruošę judėti šiandien?
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {plan?.name ?? "Bėgimo klubas"} ·{" "}
              {formatCurrency(plan?.monthlyFee ?? 49)}/mėn.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between px-1 text-[11px]">
            <span className="font-semibold uppercase tracking-widest text-lime-300">
              Šią savaitę
            </span>
            <div className="flex items-center gap-2">
              <span className="text-white/70">
                <span className="font-semibold text-white">
                  {weeklySessions}
                </span>
                <span className="text-white/50"> / 7 dalyvauta</span>
              </span>
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-lime-200 transition-colors hover:border-lime-400/40 hover:bg-white/[0.1]"
                aria-label="Atidaryti mėnesio treniruočių kalendorių"
              >
                <CalendarDays className="h-3 w-3" />
                Mėnuo
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {weeklyData.map((d) => (
              <div
                key={d.iso}
                className="flex flex-col items-center gap-1.5"
                title={
                  d.attended
                    ? "Dalyvauta"
                    : d.hadSession
                      ? d.isFuture
                        ? "Būsima treniruotė"
                        : "Praleista"
                      : "Poilsio diena"
                }
              >
                <div
                  className={clsx(
                    "grid h-10 w-full place-items-center rounded-xl border transition-colors",
                    d.attended
                      ? "border-lime-400/70 bg-lime-400/20 text-lime-200 shadow-[0_0_0_1px_rgba(154,232,25,0.2)]"
                      : d.hadSession && !d.isFuture
                        ? "border-white/15 bg-white/[0.04] text-white/45"
                        : "border-dashed border-white/10 bg-white/[0.02] text-white/25",
                    d.isToday && "ring-2 ring-lime-400/60 ring-offset-0",
                  )}
                >
                  {d.attended ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <span className="h-1 w-3 rounded-full bg-current" />
                  )}
                </div>
                <span
                  className={clsx(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    d.isToday ? "text-lime-300" : "text-white/60",
                  )}
                >
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment status — show only if unpaid or ≤7 days until next payment */}
      {(member.paymentStatus !== "paid" ||
        daysUntil(member.paymentDueDate) <= 7) && (
        <PaymentStatusBanner
          status={member.paymentStatus}
          amount={formatCurrency(plan?.monthlyFee ?? 49)}
          dueDate={formatDateShort(member.paymentDueDate)}
          actionLabel="Peržiūrėti mokėjimus"
          onAction={() => (window.location.href = "/member/payments")}
        />
      )}

      {/* Next training */}
      {next && (
        <section className="surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
                <CalendarCheck2 className="h-4 w-4" />
              </span>
              <h2 className="font-display text-base font-bold">
                Kita treniruotė
              </h2>
            </div>
            {next.registrations.some((r) => r.memberId === member.id) ? (
              <StatusBadge tone="accent" dot>
                Užsiregistravęs
              </StatusBadge>
            ) : (
              <StatusBadge tone="warning" dot>
                Neužsiregistravęs
              </StatusBadge>
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
              <p className="text-base font-semibold text-ink-900 dark:text-ink-50">
                {next.title}
              </p>
              <p className="text-xs text-ink-500">{next.location}</p>
            </div>
            <ArrowRight className="mt-3 h-4 w-4 text-ink-400" />
          </Link>
        </section>
      )}

      {/* Quick actions — hidden on mobile since bottom nav duplicates these */}
      <section className="hidden grid-cols-2 gap-3 md:grid">
        <Link
          to="/member/trainings"
          className="surface flex items-center gap-3 p-4 hover:shadow-card"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
            <CalendarCheck2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Naršyti treniruotes</p>
            <p className="text-xs text-ink-500">{upcoming.length} artėjančios</p>
          </div>
        </Link>
        <Link
          to="/member/leaderboards"
          className="surface flex items-center gap-3 p-4 hover:shadow-card"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
            <Trophy className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Rezultatų lentelės</p>
            <p className="text-xs text-ink-500">{categories.length} rungtys</p>
          </div>
        </Link>
        <Link
          to="/member/payments"
          className="surface flex items-center gap-3 p-4 hover:shadow-card"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
            <CreditCard className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Mokėjimai</p>
            <p className="text-xs text-ink-500">
              {plan?.name ?? "Narystė"}
            </p>
          </div>
        </Link>
        <Link
          to="/member/profile"
          className="surface flex items-center gap-3 p-4 hover:shadow-card"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100">
            <Target className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Profilis</p>
            <p className="text-xs text-ink-500">Nustatymai</p>
          </div>
        </Link>
      </section>

      <TrainingCalendar
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        memberId={member.id}
        trainings={trainings}
      />
    </div>
  );
}

function TrainingCalendar({
  open,
  onClose,
  memberId,
  trainings,
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
  trainings: TrainingSession[];
}) {
  const today = todayIso();
  const now = new Date(today + "T00:00:00");
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const leading = (first.getDay() + 6) % 7;
    const total = Math.ceil((leading + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const dayNum = i - leading + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      const iso = isoDate(new Date(viewYear, viewMonth, dayNum));
      const sessionsOnDay = trainings.filter(
        (t) => t.date === iso && t.status !== "cancelled",
      );
      const registered = sessionsOnDay.some((t) =>
        t.registrations.some((r) => r.memberId === memberId),
      );
      const isPast = iso < today;
      const attended = registered && !(iso > today);
      return {
        dayNum,
        iso,
        attended,
        hadSession: sessionsOnDay.length > 0,
        sessions: sessionsOnDay,
        isToday: iso === today,
        isPast,
        isFuture: iso > today,
      };
    });
  }, [viewYear, viewMonth, trainings, memberId, today]);

  const attendedCount = cells.filter((c) => c?.attended).length;
  const missedCount = cells.filter(
    (c) => c && !c.attended && c.hadSession && c.isPast,
  ).length;
  const monthLabel = new Intl.DateTimeFormat("lt-LT", {
    month: "long",
    year: "numeric",
  }).format(new Date(viewYear, viewMonth, 1));

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const goNext = () => {
    if (isCurrentMonth) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime-400/15 text-lime-300 dark:bg-lime-400/15 dark:text-lime-200">
            <CalendarDays className="h-4 w-4" />
          </span>
          Treniruočių sąrašas
        </span>
      }
      description={
        <span>
          <span className="font-semibold text-ink-900 dark:text-ink-50">
            {attendedCount}
          </span>{" "}
          {attendedCount === 1 ? "treniruotėje" : "treniruočių"} dalyvauta
          {missedCount > 0 && (
            <>
              {" · "}
              <span className="text-ink-500 dark:text-ink-400">
                {missedCount} praleista
              </span>
            </>
          )}
        </span>
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
          aria-label="Ankstesnis mėnuo"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-base font-bold tracking-tight text-ink-900 dark:text-ink-50">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={goNext}
          disabled={isCurrentMonth}
          className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800 dark:disabled:hover:bg-transparent"
          aria-label="Kitas mėnuo"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center">
        {["P", "A", "T", "K", "P", "Š", "S"].map((d, i) => (
          <span
            key={i}
            className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 dark:text-ink-500"
          >
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) => {
          if (!c) return <span key={i} className="aspect-square" />;
          const label = c.attended
            ? `Dalyvauta: ${c.sessions.map((s) => s.title).join(", ")}`
            : c.hadSession && c.isPast
              ? `Praleista: ${c.sessions.map((s) => s.title).join(", ")}`
              : c.hadSession
                ? `Artėjanti: ${c.sessions.map((s) => s.title).join(", ")}`
                : "Poilsio diena";
          return (
            <div
              key={i}
              title={label}
              className={clsx(
                "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-semibold tabular-nums transition-colors",
                c.attended
                  ? "border-lime-400/70 bg-lime-400/15 text-lime-700 dark:text-lime-100"
                  : c.hadSession && c.isPast
                    ? "border-ink-200 bg-ink-100/60 text-ink-500 dark:border-ink-700 dark:bg-ink-800/60 dark:text-ink-400"
                    : c.hadSession
                      ? "border-lime-400/30 bg-transparent text-ink-600 dark:text-ink-300"
                      : "border-dashed border-ink-100 bg-transparent text-ink-400 dark:border-ink-800 dark:text-ink-500",
                c.isToday && "ring-2 ring-lime-400/70 ring-offset-0",
              )}
            >
              <span>{c.dayNum}</span>
              {c.attended ? (
                <Check
                  className="h-3 w-3 text-lime-600 dark:text-lime-300"
                  strokeWidth={3}
                />
              ) : c.hadSession && c.isPast ? (
                <span className="h-1 w-2 rounded-full bg-current opacity-40" />
              ) : c.hadSession ? (
                <span className="h-1 w-1 rounded-full bg-lime-400/60" />
              ) : (
                <span className="h-1 w-1" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink-100 pt-4 text-[11px] text-ink-500 dark:border-ink-800 dark:text-ink-400">
        <span className="flex items-center gap-1.5">
          <span className="grid h-4 w-4 place-items-center rounded-md border border-lime-400/70 bg-lime-400/15">
            <Check
              className="h-2.5 w-2.5 text-lime-600 dark:text-lime-300"
              strokeWidth={3}
            />
          </span>
          Dalyvauta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-md border border-ink-200 bg-ink-100/60 dark:border-ink-700 dark:bg-ink-800/60" />
          Praleista
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-md border border-lime-400/30" />
          Artėjanti
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-md border border-dashed border-ink-200 dark:border-ink-800" />
          Poilsis
        </span>
      </div>
    </Modal>
  );
}
