import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ClipboardCopy,
  ClipboardEdit,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { FormField, SelectField, TextareaField } from '../../components/ui/FormField';
import { ExerciseBlock } from '../../components/plans/ExerciseBlock';
import type { PlanExercise, TrainingPlan } from '../../types';
import { formatDateShort, todayIso } from '../../utils/dates';

const sections = ['warmup', 'main', 'technique', 'cooldown'] as const;
const sectionLabels: Record<(typeof sections)[number], string> = {
  warmup: 'Warm-up',
  main: 'Main workout',
  technique: 'Technique',
  cooldown: 'Cool-down',
};

const templates: Array<{ id: string; name: string; exercises: Omit<PlanExercise, 'id'>[] }> = [
  {
    id: 'tpl-sprint',
    name: 'Sprint technique template',
    exercises: [
      { section: 'warmup', title: 'Easy jog', detail: '10 min easy build', time: '10 min' },
      { section: 'main', title: 'Acceleration', detail: '4 × 60 m accelerations', repetitions: '4×', distance: '60 m', rest: '2 min' },
      { section: 'technique', title: 'A-skips', detail: 'Focus on knee drive', repetitions: '3×', distance: '20 m' },
      { section: 'cooldown', title: 'Easy jog', detail: '8 min easy', time: '8 min' },
    ],
  },
  {
    id: 'tpl-tempo',
    name: 'Tempo template',
    exercises: [
      { section: 'warmup', title: 'Easy jog', detail: '15 min build to threshold', time: '15 min' },
      { section: 'main', title: 'Tempo', detail: '5 km at 4:15/km', distance: '5 km', pace: '4:15/km' },
      { section: 'cooldown', title: 'Cool-down', detail: '10 min easy', time: '10 min' },
    ],
  },
];

const rid = () => 'ex-' + Math.random().toString(36).slice(2, 8);

export default function CoachPlanEditor() {
  const { trainingId = '', memberId = '' } = useParams();
  const navigate = useNavigate();
  const training = useStore((s) => s.trainingSessions.find((t) => t.id === trainingId));
  const member = useStore((s) => s.members.find((m) => m.id === memberId));
  const plans = useStore((s) => s.trainingPlans);
  const upsert = useStore((s) => s.upsertPlan);
  const publish = useStore((s) => s.publishPlan);
  const remove = useStore((s) => s.deletePlan);
  const push = useStore((s) => s.pushToast);

  const existingPlan = useMemo(
    () => plans.find((p) => p.trainingSessionId === trainingId && p.memberId === memberId),
    [plans, trainingId, memberId],
  );

  const [plan, setPlan] = useState<TrainingPlan>(() => existingPlan ?? {
    id: 'plan-' + Math.random().toString(36).slice(2, 8),
    trainingSessionId: trainingId,
    memberId,
    title: training ? `${training.title} — ${member?.name.split(' ')[0]}` : 'New plan',
    intensity: 'Moderate',
    estimatedDuration: 60,
    coachNote: '',
    exercises: [],
    status: 'draft',
    updatedAt: todayIso(),
  });

  if (!training || !member) {
    return (
      <div>
        <PageTitle title="Plan not found" backTo="/coach/trainings" />
      </div>
    );
  }

  const previousPlans = plans.filter(
    (p) => p.memberId === memberId && p.id !== plan.id,
  );

  const grouped = sections.reduce<Record<(typeof sections)[number], PlanExercise[]>>((acc, s) => {
    acc[s] = plan.exercises.filter((e) => e.section === s);
    return acc;
  }, { warmup: [], main: [], technique: [], cooldown: [] });

  const addExercise = (section: PlanExercise['section']) => {
    const ex: PlanExercise = { id: rid(), section, title: 'New exercise', detail: '' };
    setPlan({ ...plan, exercises: [...plan.exercises, ex] });
  };

  const updateExercise = (id: string, patch: Partial<PlanExercise>) => {
    setPlan({ ...plan, exercises: plan.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  };

  const removeExercise = (id: string) => {
    setPlan({ ...plan, exercises: plan.exercises.filter((e) => e.id !== id) });
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = plan.exercises.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= plan.exercises.length) return;
    const next = [...plan.exercises];
    const [item] = next.splice(idx, 1);
    next.splice(target, 0, item);
    setPlan({ ...plan, exercises: next });
  };

  const applyTemplate = (tplId: string) => {
    const tpl = templates.find((x) => x.id === tplId);
    if (!tpl) return;
    setPlan({
      ...plan,
      exercises: tpl.exercises.map((e) => ({ ...e, id: rid() })),
    });
    push({ kind: 'info', message: `Template “${tpl.name}” applied.` });
  };

  const copyFromPrevious = (prevId: string) => {
    const prev = plans.find((p) => p.id === prevId);
    if (!prev) return;
    setPlan({
      ...plan,
      exercises: prev.exercises.map((e) => ({ ...e, id: rid(), completedByMember: false })),
      coachNote: prev.coachNote,
      intensity: prev.intensity,
      estimatedDuration: prev.estimatedDuration,
    });
    push({ kind: 'info', message: 'Previous plan copied. Adjust as needed.' });
  };

  const saveDraft = () => {
    const next = { ...plan, status: 'draft' as const, updatedAt: todayIso() };
    upsert(next);
    setPlan(next);
    push({ kind: 'success', message: 'Draft saved.' });
  };

  const publishAndSave = () => {
    const next = { ...plan, status: 'published' as const, updatedAt: todayIso() };
    upsert(next);
    publish(next.id);
    setPlan(next);
    push({ kind: 'success', message: 'Training plan updated and published to member.' });
  };

  const deleteThis = () => {
    if (existingPlan) {
      remove(existingPlan.id);
      push({ kind: 'info', message: 'Plan removed.' });
    }
    navigate(`/coach/trainings/${training.id}`);
  };

  return (
    <div>
      <PageTitle
        eyebrow="Individual plan"
        title={plan.title || 'New plan'}
        description={`${training.title} · ${formatDateShort(training.date)} · ${training.startTime}`}
        backTo={`/coach/trainings/${training.id}`}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),18rem]">
        <div className="space-y-4">
          <section className="surface p-4">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={member.name} color={member.avatarColor} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-display text-base font-bold">{member.name}</p>
                <p className="text-xs text-ink-500">{member.preferredDistance} · {member.ageGroup}</p>
              </div>
              <StatusBadge tone={plan.status === 'published' ? 'accent' : 'warning'} dot>
                {plan.status}
              </StatusBadge>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                label="Plan title"
                value={plan.title}
                onChange={(e) => setPlan({ ...plan, title: e.target.value })}
                className="sm:col-span-2"
              />
              <SelectField
                label="Intensity"
                value={plan.intensity}
                onChange={(e) => setPlan({ ...plan, intensity: e.target.value as TrainingPlan['intensity'] })}
              >
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Hard">Hard</option>
                <option value="Race pace">Race pace</option>
              </SelectField>
              <FormField
                label="Estimated duration (min)"
                type="number"
                min={5}
                value={plan.estimatedDuration}
                onChange={(e) => setPlan({ ...plan, estimatedDuration: Number(e.target.value) })}
              />
              <TextareaField
                label="Coach note to member"
                value={plan.coachNote}
                onChange={(e) => setPlan({ ...plan, coachNote: e.target.value })}
                className="sm:col-span-3"
                placeholder="Focus on relaxed shoulders and a controlled first 30 metres…"
              />
            </div>
          </section>

          {sections.map((section) => (
            <section key={section} className="surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-base font-bold">{sectionLabels[section]}</h3>
                <button type="button" className="btn-ghost h-8 px-2 text-xs" onClick={() => addExercise(section)}>
                  <Plus className="h-3.5 w-3.5" /> Add exercise
                </button>
              </div>
              {grouped[section].length === 0 ? (
                <p className="rounded-xl border border-dashed border-ink-200 p-3 text-center text-sm text-ink-500 dark:border-ink-800">
                  No exercises yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {grouped[section].map((ex, i) => {
                    const globalIndex = plan.exercises.findIndex((e) => e.id === ex.id);
                    return (
                      <div key={ex.id} className="rounded-2xl border border-ink-100 p-3 dark:border-ink-800">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
                            {section} · #{i + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button type="button" className="btn-ghost h-7 w-7 px-0" onClick={() => move(ex.id, -1)} disabled={globalIndex === 0} aria-label="Move up">
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" className="btn-ghost h-7 w-7 px-0" onClick={() => move(ex.id, 1)} disabled={globalIndex === plan.exercises.length - 1} aria-label="Move down">
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" className="btn-ghost h-7 w-7 px-0 text-red-600" onClick={() => removeExercise(ex.id)} aria-label="Remove">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <FormField label="Title" value={ex.title} onChange={(e) => updateExercise(ex.id, { title: e.target.value })} />
                          <FormField label="Repetitions" placeholder="e.g. 4×" value={ex.repetitions ?? ''} onChange={(e) => updateExercise(ex.id, { repetitions: e.target.value })} />
                          <FormField label="Distance" placeholder="e.g. 60 m" value={ex.distance ?? ''} onChange={(e) => updateExercise(ex.id, { distance: e.target.value })} />
                          <FormField label="Time" placeholder="e.g. 10 min" value={ex.time ?? ''} onChange={(e) => updateExercise(ex.id, { time: e.target.value })} />
                          <FormField label="Pace" placeholder="e.g. 4:15/km" value={ex.pace ?? ''} onChange={(e) => updateExercise(ex.id, { pace: e.target.value })} />
                          <FormField label="Rest" placeholder="e.g. 2 min" value={ex.rest ?? ''} onChange={(e) => updateExercise(ex.id, { rest: e.target.value })} />
                          <TextareaField label="Instructions" value={ex.detail} onChange={(e) => updateExercise(ex.id, { detail: e.target.value })} className="sm:col-span-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {existingPlan && (
                <button type="button" className="btn-danger" onClick={deleteThis}>
                  <Trash2 className="h-4 w-4" /> Delete plan
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={() => setPlan({ ...plan, exercises: [] })}>
                Clear exercises
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-outline" onClick={saveDraft}>
                <Save className="h-4 w-4" /> Save draft
              </button>
              <button type="button" className="btn-accent" onClick={publishAndSave}>
                <Send className="h-4 w-4" /> Publish to member
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="surface p-4">
            <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold">
              <ClipboardEdit className="h-4 w-4" /> Live preview
            </h3>
            {plan.exercises.length === 0 ? (
              <p className="text-sm text-ink-500">Add exercises to see how this plan will look for the member.</p>
            ) : (
              <div className="space-y-2">
                {plan.exercises.map((ex, i) => (
                  <ExerciseBlock key={ex.id} exercise={ex} index={i} />
                ))}
              </div>
            )}
          </section>

          <section className="surface p-4">
            <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold">
              <BookOpen className="h-4 w-4" /> Templates
            </h3>
            <div className="space-y-1.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full rounded-xl border border-ink-100 p-2.5 text-left text-sm hover:border-ink-400 dark:border-ink-800 dark:hover:border-ink-600"
                  onClick={() => applyTemplate(t.id)}
                >
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-ink-500">{t.exercises.length} exercises</p>
                </button>
              ))}
            </div>
          </section>

          <section className="surface p-4">
            <h3 className="mb-2 flex items-center gap-2 font-display text-base font-bold">
              <ClipboardCopy className="h-4 w-4" /> Copy from a previous plan
            </h3>
            {previousPlans.length === 0 ? (
              <p className="text-sm text-ink-500">No previous plans for this member yet.</p>
            ) : (
              <div className="space-y-1.5">
                {previousPlans.map((p) => {
                  const t = useStore.getState().trainingSessions.find((x) => x.id === p.trainingSessionId);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full rounded-xl border border-ink-100 p-2.5 text-left text-sm hover:border-ink-400 dark:border-ink-800 dark:hover:border-ink-600"
                      onClick={() => copyFromPrevious(p.id)}
                    >
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-xs text-ink-500">{t?.title ?? 'Session'} · {p.exercises.length} exercises</p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <Link
            to={`/coach/trainings/${training.id}`}
            className="btn-ghost w-full"
          >
            Return to session
          </Link>
        </aside>
      </div>
    </div>
  );
}
