import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarPlus, PlusCircle, Save, Trash2 } from 'lucide-react';
import { PageTitle } from '../../components/layout/PageTitle';
import { FormField, SelectField, TextareaField } from '../../components/ui/FormField';
import { useStore } from '../../store/useStore';
import type { TrainingCategory, TrainingDifficulty } from '../../types';
import { todayIso } from '../../utils/dates';

type Props = { mode: 'create' | 'edit' };

const categories: TrainingCategory[] = ['Sprint', 'Endurance', 'Technique', 'Recovery', 'Strength'];
const difficulties: TrainingDifficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

export default function CoachTrainingForm({ mode }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const existing = useStore((s) => (mode === 'edit' ? s.trainingSessions.find((t) => t.id === id) : undefined));
  const coaches = useStore((s) => s.coaches);
  const create = useStore((s) => s.createTraining);
  const update = useStore((s) => s.updateTraining);
  const push = useStore((s) => s.pushToast);

  const defaultCoachId = useStore((s) => s.currentCoachId);

  const initial = useMemo(
    () => ({
      title: existing?.title ?? '',
      description: existing?.description ?? '',
      date: existing?.date ?? todayIso(),
      startTime: existing?.startTime ?? '18:30',
      endTime: existing?.endTime ?? '19:45',
      location: existing?.location ?? '',
      coachId: existing?.coachId ?? defaultCoachId,
      category: existing?.category ?? ('Sprint' as TrainingCategory),
      difficulty: existing?.difficulty ?? ('Intermediate' as TrainingDifficulty),
      capacity: existing?.capacity ?? 24,
      registrationDeadline: existing?.registrationDeadline ?? existing?.date ?? todayIso(),
      goals: existing?.goals ?? [''],
      whatToBring: existing?.whatToBring ?? [''],
    }),
    [existing, defaultCoachId],
  );
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.location.trim()) e.location = 'Location is required.';
    if (form.startTime >= form.endTime) e.endTime = 'End time must be after start time.';
    if (form.capacity < 1) e.capacity = 'Capacity must be at least 1.';
    if (!form.description.trim()) e.description = 'Add a short description.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const clean = {
      ...form,
      goals: form.goals.map((g) => g.trim()).filter(Boolean),
      whatToBring: form.whatToBring.map((g) => g.trim()).filter(Boolean),
    };
    if (mode === 'create') {
      const created = create(clean);
      push({ kind: 'success', message: 'Training session created.' });
      navigate(`/coach/trainings/${created.id}`);
    } else if (existing) {
      update(existing.id, clean);
      push({ kind: 'success', message: 'Training session updated.' });
      navigate(`/coach/trainings/${existing.id}`);
    }
  };

  if (mode === 'edit' && !existing) {
    return (
      <div>
        <PageTitle title="Training not found" backTo="/coach/trainings" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageTitle
        title={mode === 'create' ? 'New training session' : 'Edit training session'}
        eyebrow="Coach"
        backTo={mode === 'create' ? '/coach/trainings' : `/coach/trainings/${existing?.id}`}
      />

      <form onSubmit={submit} className="space-y-6">
        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">Basics</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Title"
              required
              placeholder="e.g. Sprint Technique"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              error={errors.title}
              className="sm:col-span-2"
            />
            <TextareaField
              label="Description"
              required
              placeholder="What will members work on in this session?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              error={errors.description}
              className="sm:col-span-2"
            />
            <SelectField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TrainingCategory })}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </SelectField>
            <SelectField label="Difficulty" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as TrainingDifficulty })}>
              {difficulties.map((d) => <option key={d} value={d}>{d}</option>)}
            </SelectField>
            <SelectField label="Coach" value={form.coachId} onChange={(e) => setForm({ ...form, coachId: e.target.value })}>
              {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
            <FormField
              label="Location"
              required
              placeholder="e.g. Central Athletics Track — Field A"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              error={errors.location}
            />
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">Schedule &amp; capacity</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <FormField label="Date" required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, registrationDeadline: e.target.value })} />
            <FormField label="Start time" required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <FormField label="End time" required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} error={errors.endTime} />
            <FormField label="Capacity" required type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} error={errors.capacity} />
            <FormField
              label="Registration deadline"
              type="date"
              value={form.registrationDeadline}
              onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
              className="sm:col-span-2"
              hint="Members can register up to this date."
            />
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">Session goals</h2>
          <RepeatingList
            values={form.goals}
            onChange={(v) => setForm({ ...form, goals: v })}
            placeholder="e.g. Refine sprint start mechanics"
          />
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">What to bring</h2>
          <RepeatingList
            values={form.whatToBring}
            onChange={(v) => setForm({ ...form, whatToBring: v })}
            placeholder="e.g. Spikes"
          />
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary">
            {mode === 'create' ? <><CalendarPlus className="h-4 w-4" /> Create session</> : <><Save className="h-4 w-4" /> Save changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function RepeatingList({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <FormField
            value={v}
            placeholder={placeholder}
            onChange={(e) => onChange(values.map((x, idx) => (idx === i ? e.target.value : x)))}
            className="flex-1"
          />
          <button
            type="button"
            className="btn-ghost h-11 w-11 px-0"
            aria-label="Remove"
            onClick={() => onChange(values.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-outline h-9 text-sm"
        onClick={() => onChange([...values, ''])}
      >
        <PlusCircle className="h-4 w-4" /> Add item
      </button>
    </div>
  );
}
