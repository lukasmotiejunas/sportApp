import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from "lucide-react";
import Joyride, {
  STATUS,
  type CallBackProps,
  type Step,
} from "react-joyride";
import { useTranslation } from "react-i18next";
import { useStore, useCurrentCoach } from "../../store/useStore";
import { PageTitle } from "../../components/layout/PageTitle";
import { EmptyState } from "../../components/ui/EmptyState";
import { isoDate, todayIso, MONTH_NAMES, DAY_NAMES_LONG } from "../../utils/dates";
import type { TrainingSession } from "../../types";

const WEEKDAY_LABELS = ["Pr", "An", "Tr", "Kt", "Pn", "Št", "Sk"];

export default function CoachSchedule() {
  const { t } = useTranslation();
  const coach = useCurrentCoach();
  const trainings = useStore((s) => s.trainingSessions);

  const today = todayIso();
  const now = new Date(today + "T00:00:00");
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [runTour, setRunTour] = useState(false);

  const monthTrainings = useMemo(() => {
    if (!coach) return [];
    return trainings
      .filter((t) => t.coachId === coach.id && t.status !== "cancelled")
      .filter((t) => {
        const d = new Date(t.date + "T00:00:00");
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      })
      .sort((a, b) =>
        (a.date + a.startTime).localeCompare(b.date + b.startTime),
      );
  }, [trainings, coach, viewYear, viewMonth]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, TrainingSession[]>();
    for (const t of monthTrainings) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return map;
  }, [monthTrainings]);

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Start week on Monday: getDay() returns 0 for Sunday.
    const leading = (first.getDay() + 6) % 7;
    const total = Math.ceil((leading + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const dayNum = i - leading + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      const iso = isoDate(new Date(viewYear, viewMonth, dayNum));
      const sessions = sessionsByDate.get(iso) ?? [];
      return {
        dayNum,
        iso,
        sessions,
        isToday: iso === today,
        isPast: iso < today,
      };
    });
  }, [viewYear, viewMonth, sessionsByDate, today]);

  const workingDaysCount = useMemo(
    () => new Set(monthTrainings.map((t) => t.date)).size,
    [monthTrainings],
  );

  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };
  const goToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(today);
  };

  const selectedSessions = selectedDate
    ? sessionsByDate.get(selectedDate) ?? []
    : [];

  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        "Mano kalendorius — čia matote, kada šį mėnesį vedate treniruotes. Rodomos tik jums priskirtos treniruotės.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="month-nav"]',
      content:
        "Mėnesio navigacija. Strėlytėmis pereikite tarp mėnesių — matysite ir praėjusius, ir būsimus. „Šiandien“ mygtukas iškart sugrąžina į šiandienos datą.",
    },
    {
      target: '[data-tour="calendar-grid"]',
      content:
        "Kalendoriaus tinklelis. Užpildytos žalios dienos — jose vedate treniruotes. Skaičiukas viršutiniame dešiniajame kampe rodo, kiek treniruočių tą dieną. Šiandiena pažymėta ryškiu žaliu apvadu. Paspauskite dieną, kad pamatytumėte jos treniruotes apačioje.",
      placement: "bottom",
    },
    {
      target: '[data-tour="legend"]',
      content:
        "Legenda — greita atmintis, ką reiškia spalvos ir apvadas.",
    },
    {
      target: '[data-tour="day-details"]',
      content:
        "Pasirinktos dienos treniruotės. Kiekviena kortelė rodo laiką, pavadinimą, vietą ir užsiregistravusių dalyvių skaičių. Paspaudę pereikite į treniruotės detales — ten galite matyti dalyvių sąrašą ir jų individualius planus.",
      placement: "top",
    },
  ];

  const handleTourCallback = (data: CallBackProps) => {
    const done: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (done.includes(data.status)) {
      setRunTour(false);
    }
  };

  return (
    <div>
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        disableScrolling={false}
        callback={handleTourCallback}
        locale={{
          back: t("joyride.back"),
          close: t("joyride.close"),
          last: t("joyride.last"),
          next: t("joyride.next"),
          skip: t("joyride.skip"),
        }}
        styles={{
          options: {
            primaryColor: "#5da004",
            zIndex: 10000,
          },
        }}
      />
      <div data-tour="page-title">
        <PageTitle
          eyebrow={t("coach_schedule.eyebrow")}
          title={t("coach_schedule.title")}
          description={t("coach_schedule.description")}
          action={
            <button
              type="button"
              className="btn-ghost h-9 px-3 text-xs"
              onClick={() => setRunTour(true)}
            >
              <BookOpen className="h-4 w-4" />
              Interaktyvus vadovas
            </button>
          }
        />
      </div>

      <section className="surface p-4">
        <div
          className="mb-4 flex flex-wrap items-center gap-3"
          data-tour="month-nav"
        >
          <button
            type="button"
            onClick={goPrev}
            className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label={t("coach_schedule.prev_month_aria")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <p className="font-display text-lg font-bold capitalize tracking-tight text-ink-900 dark:text-ink-50">
              {monthLabel}
            </p>
            <p className="text-xs text-ink-500">
              {workingDaysCount === 0
                ? t("coach_schedule.no_trainings_month")
                : t("coach_schedule.working_days", { days: workingDaysCount, count: monthTrainings.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={goToday}
            className="btn-ghost h-9 px-3 text-xs"
          >
            {t("coach_schedule.today_btn")}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-600 transition-colors hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label={t("coach_schedule.next_month_aria")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAY_LABELS.map((d, i) => (
            <span
              key={i}
              className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 dark:text-ink-500"
            >
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5" data-tour="calendar-grid">
          {cells.map((c, i) => {
            if (!c) return <span key={i} className="aspect-square" />;
            const hasSessions = c.sessions.length > 0;
            const isSelected = selectedDate === c.iso;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDate(c.iso)}
                aria-pressed={isSelected}
                className={clsx(
                  "group relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border text-sm font-semibold tabular-nums transition-colors",
                  hasSessions
                    ? c.isPast
                      ? "border-lime-400/50 bg-lime-400/10 text-lime-800 dark:text-lime-100"
                      : "border-lime-400 bg-lime-400/20 text-lime-900 dark:text-lime-100"
                    : "border-dashed border-ink-100 bg-transparent text-ink-400 dark:border-ink-800 dark:text-ink-500",
                  c.isToday && "ring-2 ring-lime-400 ring-offset-0",
                  isSelected &&
                    "border-ink-900 dark:border-lime-400 shadow-pop",
                )}
              >
                <span>{c.dayNum}</span>
                {hasSessions && (
                  <span className="mt-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-lime-500 dark:bg-lime-400" />
                )}
                {c.sessions.length > 1 && (
                  <span className="absolute right-1 top-1 rounded-full bg-lime-500 px-1 text-[9px] font-bold text-white dark:bg-lime-400 dark:text-ink-950">
                    {c.sessions.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          className="mt-4 flex items-center gap-3 border-t border-ink-100 pt-3 text-[11px] text-ink-500 dark:border-ink-800"
          data-tour="legend"
        >
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md border border-lime-400 bg-lime-400/20" />
            {t("coach_schedule.legend_training")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md border-2 border-lime-400" />
            {t("coach_schedule.legend_today")}
          </span>
        </div>
      </section>

      <section className="mt-4" data-tour="day-details">
        <div className="mb-2 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-ink-500" />
          <h2 className="font-display text-base font-bold">
            {selectedDate
              ? formatSelectedDate(selectedDate)
              : t("coach_schedule.select_day")}
          </h2>
        </div>

        {!selectedDate ? (
          <p className="text-sm text-ink-500">
            {t("coach_schedule.click_day")}
          </p>
        ) : selectedSessions.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t("coach_schedule.no_trainings_day")}
            description={t("coach_schedule.no_trainings_day_desc")}
          />
        ) : (
          <ul className="space-y-2">
            {selectedSessions.map((sess) => {
              const registered = sess.registrations.filter(
                (r) => r.status === "registered",
              ).length;
              return (
                <li key={sess.id}>
                  <Link
                    to={`/coach/trainings/${sess.id}`}
                    className="surface flex items-start gap-3 p-3 transition-colors hover:border-ink-300 dark:hover:border-ink-600"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-400/15 text-lime-700 dark:text-lime-200">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                        {sess.startTime}–{sess.endTime}
                      </p>
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
                        {sess.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{sess.location}</span>
                        <span className="ml-1 text-ink-400">
                          {t("coach_schedule.participants_count", { count: registered, total: sess.capacity })}
                        </span>
                      </p>
                    </div>
                    <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-ink-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatSelectedDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  const day = DAY_NAMES_LONG[d.getDay()];
  const month = MONTH_NAMES[d.getMonth()];
  return `${day}, ${d.getDate()} ${month} ${d.getFullYear()}`;
}
