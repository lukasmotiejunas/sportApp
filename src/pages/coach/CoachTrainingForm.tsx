import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarPlus, ClipboardList, Save } from 'lucide-react';
import Joyride, { STATUS, type CallBackProps, type Step } from 'react-joyride';
import { PageTitle } from '../../components/layout/PageTitle';
import { FormField, SelectField, TextareaField } from '../../components/ui/FormField';
import { useStore } from '../../store/useStore';
import { todayIso } from '../../utils/dates';
import { useTrainingsBase } from '../../utils/roleContext';
import { ensureAdminCoachApi } from '../../api/profile';

type Props = { mode: 'create' | 'edit' };

export default function CoachTrainingForm({ mode }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { base, eyebrow, isAdmin } = useTrainingsBase();
  const existing = useStore((s) => (mode === 'edit' ? s.trainingSessions.find((t) => t.id === id) : undefined));
  const coaches = useStore((s) => s.coaches);
  const templates = useStore((s) => s.trainingTemplates);
  const create = useStore((s) => s.createTraining);
  const update = useStore((s) => s.updateTraining);
  const push = useStore((s) => s.pushToast);

  const authUserId = useStore((s) => s.authUser?.id ?? '');
  const currentCoachId = useStore((s) => s.currentCoachId);
  const setCurrentCoachId = useStore((s) => s.setCurrentCoachId);
  const addCoach = useStore((s) => s.addCoach);
  // Coaches use their own id by default; admins (no currentCoachId) fall back
  // to the first coach in the club so the form submits with a valid value even
  // when the dropdown isn't touched.
  const defaultCoachId = currentCoachId || coaches[0]?.id || '';

  // Ensure the admin has a Coach record so they appear in the trainer dropdown.
  useEffect(() => {
    if (!isAdmin || currentCoachId) return;
    ensureAdminCoachApi().then((coach) => {
      addCoach(coach);
      setCurrentCoachId(coach.id);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

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
  const [templateId, setTemplateId] = useState('');

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => a.name.localeCompare(b.name, 'lt')),
    [templates],
  );

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (!id) return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setForm((prev) => ({
      ...prev,
      title: t.title || prev.title,
      description: t.description || prev.description,
      location: t.location || prev.location,
      startTime: t.startTime || prev.startTime,
      endTime: t.endTime || prev.endTime,
      capacity: t.capacity ?? prev.capacity,
      defaultPlan: t.defaultPlan || prev.defaultPlan,
    }));
    push({ kind: 'success', message: `Užpildyta pagal „${t.name}“.` });
  };

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

  const tourEnabled = mode === 'create';
  const tourStorageKey = `trainings_new_tour_seen:${authUserId || 'anon'}`;
  const [runTour, setRunTour] = useState(false);
  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        'Sveiki! Trumpai paaiškinsime, kaip sukurti treniruotę. Užpildykite laukus, o pabaigoje paspauskite „Sukurti treniruotę".',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="template-picker"]',
      content:
        'Jei jau esate sukūrę pasikartojantį treniruotės planą (pvz. „Antradienio sprinto sesija"), pasirinkite jį čia — laukai užsipildys automatiškai. Jei plano dar neturite — praleiskite.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="title"]',
      content:
        'Trumpas treniruotės pavadinimas, kurį matys jūsų nariai — pvz. „Sprinto technika" arba „Jėgos treniruotė salėje".',
    },
    {
      target: '[data-tour="description"]',
      content:
        'Aprašykite, ką nariai darys šioje treniruotėje. Ši informacija matoma prieš registruojantis — kuo aiškiau, tuo lengviau nariams apsispręsti.',
    },
    {
      target: '[data-tour="coach"]',
      content:
        'Pasirinkite trenerį, kuris ves šią treniruotę. Nariai matys jo vardą registracijos ir treniruotės metu.',
    },
    {
      target: '[data-tour="location"]',
      content:
        'Vieta — kur vyks treniruotė. Rašykite kuo tiksliau, kad nariai lengvai atrastų (pvz. „Vingio parkas — pagrindinis takas").',
    },
    {
      target: '[data-tour="schedule"]',
      content:
        'Nustatykite datą, pradžios ir pabaigos laiką bei talpą (kiek narių gali užsiregistruoti). Pilnai užpildžius talpą, kiti automatiškai patenka į laukiančiųjų sąrašą.',
      placement: 'top',
    },
    {
      target: '[data-tour="deadline"]',
      content:
        'Registracijos terminas — iki kada nariai gali užsiregistruoti. Pagal nutylėjimą sutampa su treniruotės data, bet galite uždaryti registraciją anksčiau.',
    },
    {
      target: '[data-tour="default-plan"]',
      content:
        'Bendras planas — pratimai ir jų eiliškumas, kuriuos matys visi užsiregistravę. Vėliau kiekvienam nariui galėsite pritaikyti individualų planą.',
      placement: 'top',
    },
    {
      target: '[data-tour="submit"]',
      content:
        'Kai visi laukai užpildyti — paspauskite čia. Treniruotė bus sukurta ir taps matoma nariams registruotis.',
      placement: 'top',
    },
  ];

  useEffect(() => {
    if (!tourEnabled) return;
    try {
      if (!localStorage.getItem(tourStorageKey)) {
        setRunTour(true);
      }
    } catch {
      // localStorage blocked — skip silently.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourEnabled]);

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

  if (mode === 'edit' && !existing) {
    return (
      <div>
        <PageTitle title="Treniruotė nerasta" backTo={base} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {tourEnabled && (
        <Joyride
          steps={tourSteps}
          run={runTour}
          continuous
          showProgress
          showSkipButton
          disableScrolling={false}
          callback={handleTourCallback}
          locale={{
            back: 'Atgal',
            close: 'Uždaryti',
            last: 'Baigti',
            next: 'Toliau',
            skip: 'Praleisti',
          }}
          styles={{
            options: {
              primaryColor: '#5da004',
              zIndex: 10000,
            },
          }}
        />
      )}
      <div data-tour="page-title">
        <PageTitle
          title={mode === 'create' ? 'Nauja treniruotė' : 'Redaguoti treniruotę'}
          eyebrow={eyebrow}
          backTo={mode === 'create' ? base : `${base}/${existing?.id}`}
        />
      </div>

      <form onSubmit={submit} className="space-y-6">
        {mode === 'create' && (
          <section className="surface p-4" data-tour="template-picker">
            <div className="mb-2 flex items-center gap-2 font-display text-base font-bold">
              <ClipboardList className="h-4 w-4" />
              Užpildyti pagal planą
            </div>
            {sortedTemplates.length === 0 ? (
              <p className="text-sm text-ink-500">
                Kol kas planų nėra.{' '}
                <Link
                  to={
                    isAdmin
                      ? '/admin/training-templates'
                      : '/coach/training-templates'
                  }
                  className="font-semibold underline"
                >
                  Sukurti pirmą planą
                </Link>
                .
              </p>
            ) : (
              <SelectField
                label="Pasirinkite planą"
                value={templateId}
                onChange={(e) => applyTemplate(e.target.value)}
                hint="Pasirinkus, laukai bus užpildyti pagal plano reikšmes."
              >
                <option value="">— Nenaudoti plano —</option>
                {sortedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </SelectField>
            )}
          </section>
        )}

        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-bold">Pagrindinė informacija</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div data-tour="title" className="sm:col-span-2">
              <FormField
                label="Pavadinimas"
                required
                placeholder="pvz. Sprinto technika"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                error={errors.title}
              />
            </div>
            <div data-tour="description" className="sm:col-span-2">
              <TextareaField
                label="Aprašymas"
                required
                placeholder="Ką nariai darys šioje treniruotėje?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                error={errors.description}
              />
            </div>
            <div data-tour="coach">
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
            </div>
            <div data-tour="location">
              <FormField
                label="Vieta"
                required
                placeholder="pvz. Centrinis lengvosios atletikos takas — A aikštė"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                error={errors.location}
              />
            </div>
          </div>
        </section>

        <section className="surface p-4" data-tour="schedule">
          <h2 className="mb-3 font-display text-base font-bold">Tvarkaraštis ir talpa</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <FormField label="Data" required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, registrationDeadline: e.target.value })} />
            <FormField label="Pradžios laikas" required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <FormField label="Pabaigos laikas" required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} error={errors.endTime} />
            <FormField label="Talpa" required type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} error={errors.capacity} />
            <div data-tour="deadline" className="sm:col-span-2">
              <FormField
                label="Registracijos terminas"
                type="date"
                value={form.registrationDeadline}
                onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
                hint="Nariai gali registruotis iki šios datos."
              />
            </div>
          </div>
        </section>

        <section className="surface p-4" data-tour="default-plan">
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
          <button type="submit" className="btn-primary" data-tour="submit">
            {mode === 'create' ? <><CalendarPlus className="h-4 w-4" /> Sukurti treniruotę</> : <><Save className="h-4 w-4" /> Išsaugoti pakeitimus</>}
          </button>
        </div>
      </form>
    </div>
  );
}

