import { useMemo, useState } from 'react';
import { CalendarX } from 'lucide-react';
import { useStore, useCurrentMember } from '../../store/useStore';
import { TrainingCard } from '../../components/trainings/TrainingCard';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyState } from '../../components/ui/EmptyState';
import { addDays, DAY_NAMES, formatDateLong, todayIso } from '../../utils/dates';

export default function MemberTrainings() {
  const member = useCurrentMember();
  const trainings = useStore((s) => s.trainingSessions);
  const coaches = useStore((s) => s.coaches);
  const members = useStore((s) => s.members);

  const today = todayIso();
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const dateStrip = useMemo(() => Array.from({ length: 10 }, (_, i) => addDays(today, i)), [today]);

  const filtered = trainings
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div>
      <PageTitle
        title="Trainings"
        description={formatDateLong(selectedDate)}
        eyebrow="Schedule"
      />

      {/* Date strip */}
      <div className="mb-4 -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
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
        <EmptyState
          icon={CalendarX}
          title="No sessions on this day"
          description="Try another date."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const coach = coaches.find((c) => c.id === t.coachId);
            const registered = t.registrations
              .map((r) => members.find((m) => m.id === r.memberId))
              .filter(Boolean) as typeof members;
            const isRegistered = t.registrations.some((r) => r.memberId === member.id);
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
