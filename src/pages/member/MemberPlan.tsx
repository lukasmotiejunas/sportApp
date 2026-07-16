import { useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, MessageSquareText, StickyNote } from 'lucide-react';
import { useStore, useCurrentMember } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { EmptyState } from '../../components/ui/EmptyState';
import { ExerciseBlock } from '../../components/plans/ExerciseBlock';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TextareaField } from '../../components/ui/FormField';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatDateShort, todayIso } from '../../utils/dates';
import { Tabs } from '../../components/ui/Tabs';

const sectionLabels = {
  warmup: 'Warm-up',
  main: 'Main set',
  technique: 'Technique',
  cooldown: 'Cool-down',
} as const;

export default function MemberPlan() {
  const member = useCurrentMember();
  const plans = useStore((s) => s.trainingPlans);
  const trainings = useStore((s) => s.trainingSessions);
  const toggle = useStore((s) => s.toggleExerciseComplete);
  const setNote = useStore((s) => s.setMemberNote);
  const push = useStore((s) => s.pushToast);

  const myPlans = useMemo(
    () => plans.filter((p) => p.memberId === member.id && p.status === 'published'),
    [plans, member.id],
  );
  const previous = useMemo(() => {
    return myPlans
      .map((p) => ({
        plan: p,
        session: trainings.find((t) => t.id === p.trainingSessionId),
      }))
      .filter((x) => x.session && x.session.date < todayIso())
      .sort((a, b) => (b.session!.date).localeCompare(a.session!.date));
  }, [myPlans, trainings]);

  const upcoming = useMemo(() => {
    return myPlans
      .map((p) => ({
        plan: p,
        session: trainings.find((t) => t.id === p.trainingSessionId),
      }))
      .filter((x) => x.session && x.session.date >= todayIso())
      .sort((a, b) => (a.session!.date).localeCompare(b.session!.date));
  }, [myPlans, trainings]);

  const [tab, setTab] = useState<'upcoming' | 'previous'>('upcoming');

  const activeList = tab === 'upcoming' ? upcoming : previous;

  return (
    <div>
      <PageTitle
        title="My Plan"
        description="Sessions your coach has prepared for you."
        eyebrow="Personal training"
      />

      <div className="mb-4">
        <Tabs
          items={[
            { id: 'upcoming', label: 'Upcoming', badge: upcoming.length },
            { id: 'previous', label: 'Previous', badge: previous.length },
          ]}
          active={tab}
          onChange={(id) => setTab(id as 'upcoming' | 'previous')}
        />
      </div>

      {activeList.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            tab === 'upcoming'
              ? 'No plan published yet'
              : 'No previous plans available'
          }
          description={
            tab === 'upcoming'
              ? 'Your coach will publish an individual training plan for your next registered session.'
              : 'Plans your coach has published for past sessions will appear here.'
          }
        />
      ) : (
        <div className="space-y-5">
          {activeList.map(({ plan, session }) => {
            if (!session) return null;
            const completed = plan.exercises.filter((e) => e.completedByMember).length;
            const total = plan.exercises.length;
            const pct = total ? (completed / total) * 100 : 0;
            const bySection = plan.exercises.reduce<Record<string, typeof plan.exercises>>((acc, ex) => {
              (acc[ex.section] ??= []).push(ex);
              return acc;
            }, {});

            return (
              <article key={plan.id} className="surface overflow-hidden">
                <header className="border-b border-ink-100 p-4 dark:border-ink-800">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                        <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
                        {formatDateShort(session.date)} · {session.startTime}
                      </p>
                      <h3 className="font-display text-lg font-bold">{plan.title}</h3>
                      <p className="text-sm text-ink-500">{session.title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge tone="accent" dot>
                        {plan.intensity}
                      </StatusBadge>
                      <span className="text-[11px] text-ink-500">~{plan.estimatedDuration} min</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={pct} tone={pct === 100 ? 'success' : 'accent'} size="sm" />
                    <p className="mt-1.5 text-xs text-ink-500">
                      {completed} of {total} exercises completed
                    </p>
                  </div>
                </header>

                <div className="space-y-4 p-4">
                  {(['warmup', 'main', 'technique', 'cooldown'] as const).map((section) => {
                    const exs = bySection[section];
                    if (!exs || exs.length === 0) return null;
                    return (
                      <div key={section}>
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-500">
                          {sectionLabels[section]}
                        </p>
                        <div className="space-y-2">
                          {exs.map((ex, i) => (
                            <ExerciseBlock
                              key={ex.id}
                              exercise={ex}
                              index={i}
                              showCheck
                              onToggleComplete={() => toggle(plan.id, ex.id)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-ink-100 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900/60">
                  <div className="mb-3 flex items-start gap-2 text-sm">
                    <MessageSquareText className="mt-0.5 h-4 w-4 text-ink-500" />
                    <div>
                      <p className="font-semibold text-ink-900 dark:text-ink-50">Coach note</p>
                      <p className="text-ink-600 dark:text-ink-300">{plan.coachNote}</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 inline-flex items-center gap-1 text-sm font-semibold text-ink-800 dark:text-ink-200">
                      <StickyNote className="h-3.5 w-3.5" /> My notes
                    </div>
                    <TextareaField
                      hint="Kept locally in this browser for the prototype."
                      value={plan.memberNote ?? ''}
                      onChange={(e) => setNote(plan.id, e.target.value)}
                      onBlur={() => plan.memberNote && push({ kind: 'success', message: 'Notes saved.' })}
                      placeholder="How did the session feel? Any adjustments?"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
