import { useEffect, useMemo, useState } from 'react';
import { CalendarX } from 'lucide-react';
import Joyride, {
  STATUS,
  type CallBackProps,
  type Step,
} from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { useStore, useCurrentMember } from '../../store/useStore';
import { TrainingCard } from '../../components/trainings/TrainingCard';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyState } from '../../components/ui/EmptyState';
import { addDays, DAY_NAMES, formatDateLong, todayIso } from '../../utils/dates';

export default function MemberTrainings() {
  const { t } = useTranslation();
  const member = useCurrentMember();
  const trainings = useStore((s) => s.trainingSessions);
  const coaches = useStore((s) => s.coaches);
  const members = useStore((s) => s.members);
  const authUserId = useStore((s) => s.authUser?.id ?? '');

  const today = todayIso();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [runTour, setRunTour] = useState(false);

  const dateStrip = useMemo(() => Array.from({ length: 10 }, (_, i) => addDays(today, i)), [today]);

  const filtered = trainings
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const tourStorageKey = `member_trainings_tour_seen:${authUserId || 'anon'}`;
  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        'Treniruotės — čia matote artimiausių 10 dienų tvarkaraštį. Pasirinkite dieną viršuje, o žemiau pamatysite tos dienos treniruotes ir galėsite užsiregistruoti.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="date-strip"]',
      content:
        'Datų juosta — 10 artimiausių dienų. Paspaudę datą pamatysite tos dienos treniruotes. Šiandiena pažymėta žaliu tašku po diena. Slinkite į dešinę, kad pamatytumėte tolimesnes dienas.',
    },
    {
      target: '[data-tour="training-list"]',
      content:
        'Pasirinktos dienos treniruotės. Kiekviena kortelė rodo laiką, pavadinimą, trenerį ir dalyvių skaičių. Paspaudę atversite detales — ten galėsite užsiregistruoti arba atsisakyti dalyvavimo.',
      placement: 'top',
    },
  ];

  useEffect(() => {
    try {
      if (!localStorage.getItem(tourStorageKey)) {
        setRunTour(true);
      }
    } catch {
      // localStorage blocked — skip silently.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTourCallback = (data: CallBackProps) => {
    const done: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (done.includes(data.status)) {
      setRunTour(false);
      try {
        localStorage.setItem(tourStorageKey, '1');
      } catch {
        // ignore
      }
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
          back: t('joyride.back'),
          close: t('joyride.close'),
          last: t('joyride.last'),
          next: t('joyride.next'),
          skip: t('joyride.skip'),
        }}
        styles={{
          options: {
            primaryColor: '#5da004',
            zIndex: 10000,
          },
        }}
      />
      <div data-tour="page-title">
        <PageTitle
          title={t('member_trainings.title')}
          description={formatDateLong(selectedDate)}
          eyebrow={t('coach_schedule.title')}
        />
      </div>

      {/* Date strip */}
      <div
        className="mb-4 -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 no-scrollbar"
        data-tour="date-strip"
      >
        {dateStrip.map((d) => {
          const dt = new Date(d + 'T00:00:00');
          const isActive = d === selectedDate;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={
                'flex snap-start shrink-0 flex-col items-center rounded-2xl border p-2.5 min-w-[3.75rem] transition-colors ' +
                (isActive
                  ? 'border-ink-900 bg-ink-900 text-white dark:border-lime-400 dark:bg-lime-400 dark:text-ink-950'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200')
              }
              aria-pressed={isActive}
              aria-label={formatDateLong(d)}
            >
              <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{DAY_NAMES[dt.getDay()]}</span>
              <span className="font-display text-lg font-bold">{dt.getDate()}</span>
              {isToday && !isActive && (
                <span className="mt-0.5 h-1 w-1 rounded-full bg-lime-500" />
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div data-tour="training-list">
          <EmptyState
            icon={CalendarX}
            title={t('member_trainings.empty')}
            description={t('member_trainings.search_placeholder')}
          />
        </div>
      ) : (
        <div className="space-y-3" data-tour="training-list">
          {filtered.map((t) => {
            const coach = coaches.find((c) => c.id === t.coachId);
            const activeRegs = t.registrations.filter(
              (r) => r.status === "registered",
            );
            const registered = activeRegs
              .map((r) => members.find((m) => m.id === r.memberId))
              .filter(Boolean) as typeof members;
            const isRegistered = t.registrations.some(
              (r) => r.memberId === member.id && r.status === "registered",
            );
            return (
              <TrainingCard
                key={t.id}
                training={t}
                coach={coach}
                members={registered}
                isRegistered={isRegistered}
                linkTo={`/member/trainings/${t.id}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
