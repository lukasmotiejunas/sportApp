import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarPlus, Save } from 'lucide-react';
import { PageTitle } from '../../components/layout/PageTitle';
import { FormField, SelectField, TextareaField } from '../../components/ui/FormField';
import { useStore } from '../../store/useStore';
import { todayIso } from '../../utils/dates';
import { useTrainingsBase } from '../../utils/roleContext';

type Props = { mode: 'create' | 'edit' };

export default function CoachTrainingForm({ mode }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { base, eyebrow } = useTrainingsBase();
  const existing = useStore((s) => (mode === 'edit' ? s.trainingSessions.find((t) => t.id === id) : undefined));
  const coaches = useStore((s) => s.coaches);
  const create = useStore((s) => s.createTraining);
  const update = useStore((s) => s.updateTraining);
  const push = useStore((s) => s.pushToast);

  const currentCoachId = useStore((s) => s.currentCoachId);
  // Coaches use their own id by default; admins (no currentCoachId) fall back
  // to the first coach in the club so the form submits with a valid value even
  // when the dropdown isn't touched.
  const defaultCoachId = currentCoachId || coaches[0]?.id || '';

  const initial = useMemo(
    () => ({
      title: existing?.title ?? '',
      description: existing?.description ?? '',
      date: existing?.date ?? todayIso(),
      startTime: existing?.startTime ?? '18:30',
      endTime: existing?.endTime ?? '19:45',
      location: existing?.location ?? '',
      coachId: existing?.coachId ?? defaultCoachId,
      capacity: existing?.capacity ?? 24,
      registrationDeadline: existing?.registrationDeadline ?? existing?.date ?? todayIso(),
      defaultPlan: existing?.defaultPlan ?? '',
    }),
    [existing, defaultCoachId],
  );
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Pavadinimas privalomas.';
    if (!form.location.trim()) e.location = 'Vieta privaloma.';
    if (form.startTime >= form.endTime) e.endTime = 'Pabaigos laikas turi būti vėlesnis už pradžios.';
    if (form.capacity < 1) e.capacity = 'Talpa turi būti bent 1.';
    if (!form.description.trim()) e.description = 'Pridėkite trumpą aprašymą.';
    if (!form.coachId) e.coachId = 'Pasirinkite trenerį. Prieš tai pridėkite bent vieną trenerį klube.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const clean = {
      ...form,
      // Legacy fields — always empty going forward.
      goals: [] as string[],
      whatToBring: [] as string[],
    };
    if (mode === 'create') {
      const created = create(clean);
      push({ kind: 'success', message: 'Treniruotė sukurta.' });
      navigate(`${base}/${created.id}`);
    } else if (existing) {
      update(existing.id, clean);
      push({ kind: 'success', message: 'Treniruotė atnaujinta.' });
      navigate(`${base}/${existing.id}`);
    }
  };

  if (mode === 'edit' && !existing) {
    return (
      <div>
        <PageTitle title="Treniruotė nerasta" backTo={base} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageTitle
        title={mode === 'create' ? 'Nauja treniruotė' : 'Redaguoti treniruotę'}
        eyebrow={eyebrow}
        backTo={mode === 'create' ? base : `${base}/${existing?.id}`}
      />

      <form onSubmit={submit} className="space-y-6">
        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">Pagrindinė informacija</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Pavadinimas"
              required
              placeholder="pvz. Sprinto technika"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              error={errors.title}
              className="sm:col-span-2"
            />
            <TextareaField
              label="Aprašymas"
              required
              placeholder="Ką nariai darys šioje treniruotėje?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              error={errors.description}
              className="sm:col-span-2"
            />
            <SelectField
              label="Treneris"
              value={form.coachId}
              onChange={(e) => setForm({ ...form, coachId: e.target.value })}
              error={errors.coachId}
            >
              {coaches.length === 0 && (
                <option value="">— Nėra trenerių —</option>
              )}
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            <FormField
              label="Vieta"
              required
              placeholder="pvz. Centrinis lengvosios atletikos takas — A aikštė"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              error={errors.location}
            />
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">Tvarkaraštis ir talpa</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <FormField label="Data" required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, registrationDeadline: e.target.value })} />
            <FormField label="Pradžios laikas" required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <FormField label="Pabaigos laikas" required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} error={errors.endTime} />
            <FormField label="Talpa" required type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} error={errors.capacity} />
            <FormField
              label="Registracijos terminas"
              type="date"
              value={form.registrationDeadline}
              onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
              className="sm:col-span-2"
              hint="Nariai gali registruotis iki šios datos."
            />
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="mb-1 font-display text-base font-bold">Bendras planas</h2>
          <p className="mb-3 text-xs text-ink-500">
            Šis planas bus automatiškai priskirtas kiekvienam užsiregistravusiam
            nariui. Vėliau galėsite pritaikyti kiekvienam individualiai.
          </p>
          <TextareaField
            label="Plano tekstas"
            value={form.defaultPlan}
            onChange={(e) => setForm({ ...form, defaultPlan: e.target.value })}
            rows={10}
            placeholder="Apšilimas · Pagrindinė dalis · Atsipalaidavimas · Pastabos…"
          />
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Atšaukti</button>
          <button type="submit" className="btn-primary">
            {mode === 'create' ? <><CalendarPlus className="h-4 w-4" /> Sukurti treniruotę</> : <><Save className="h-4 w-4" /> Išsaugoti pakeitimus</>}
          </button>
        </div>
      </form>
    </div>
  );
}

