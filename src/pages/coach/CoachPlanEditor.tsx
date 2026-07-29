import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Save, Send, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { FormField, TextareaField } from '../../components/ui/FormField';
import type { TrainingPlan } from '../../types';
import { formatDateShort, todayIso } from '../../utils/dates';
import { useTrainingsBase } from '../../utils/roleContext';

export default function CoachPlanEditor() {
  const { trainingId = '', memberId = '' } = useParams();
  const navigate = useNavigate();
  const { base } = useTrainingsBase();
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
    title: training ? `${training.title} — ${member?.name.split(' ')[0]}` : 'Naujas planas',
    duration: 0,
    coachNote: '',
    plan: '',
    status: 'draft',
    updatedAt: todayIso(),
  });

  if (!training || !member) {
    return (
      <div>
        <PageTitle title="Planas nerastas" backTo="/coach/trainings" />
      </div>
    );
  }

  const saveDraft = () => {
    const next = { ...plan, status: 'draft' as const, updatedAt: todayIso() };
    upsert(next);
    setPlan(next);
    push({ kind: 'success', message: 'Juodraštis išsaugotas.' });
  };

  const publishAndSave = () => {
    const next = { ...plan, status: 'published' as const, updatedAt: todayIso() };
    upsert(next);
    publish(next.id);
    setPlan(next);
    push({ kind: 'success', message: 'Treniruočių planas publikuotas nariui.' });
  };

  const deleteThis = () => {
    if (existingPlan) {
      remove(existingPlan.id);
      push({ kind: 'info', message: 'Planas pašalintas.' });
    }
    navigate(`${base}/${training.id}`);
  };

  return (
    <div>
      <PageTitle
        eyebrow="Asmeninis planas"
        title={plan.title || 'Naujas planas'}
        description={`${training.title} · ${formatDateShort(training.date)} · ${training.startTime}`}
        backTo={`${base}/${training.id}`}
      />

      <section className="surface p-4">
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={member.name} color={member.avatarColor} size="md" photoUrl={member.photoUrl} />
          <div className="flex-1 min-w-0">
            <p className="font-display text-base font-bold">{member.name}</p>
            <p className="text-xs text-ink-500">{member.ageGroup}</p>
          </div>
          <StatusBadge tone={plan.status === 'published' ? 'accent' : 'warning'} dot>
            {plan.status === 'published' ? 'Publikuota' : 'Juodraštis'}
          </StatusBadge>
        </div>

        <div className="grid gap-3">
          <FormField
            label="Plano pavadinimas"
            value={plan.title}
            onChange={(e) => setPlan({ ...plan, title: e.target.value })}
          />
          <TextareaField
            label="Trenerio užrašas nariui"
            value={plan.coachNote}
            onChange={(e) => setPlan({ ...plan, coachNote: e.target.value })}
            placeholder="Atsipalaidavę pečiai ir kontroliuojami pirmieji 30 metrų…"
          />
          <TextareaField
            label="Planas"
            value={plan.plan}
            onChange={(e) => setPlan({ ...plan, plan: e.target.value })}
            rows={12}
            placeholder="Aprašykite visą planą — apšilimą, pagrindinę dalį, atsipalaidavimą, pastabas…"
          />
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          {existingPlan && (
            <button type="button" className="btn-danger" onClick={deleteThis}>
              <Trash2 className="h-4 w-4" /> Ištrinti planą
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`${base}/${training.id}`} className="btn-ghost">
            Grįžti į treniruotę
          </Link>
          <button type="button" className="btn-outline" onClick={saveDraft}>
            <Save className="h-4 w-4" /> Išsaugoti juodraštį
          </button>
          <button type="button" className="btn-accent" onClick={publishAndSave}>
            <Send className="h-4 w-4" /> Publikuoti nariui
          </button>
        </div>
      </div>
    </div>
  );
}
