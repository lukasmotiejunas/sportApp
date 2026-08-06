import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import Joyride, { STATUS, type CallBackProps, type Step } from 'react-joyride';
import { PageTitle } from '../../components/layout/PageTitle';
import { FormField, TextareaField } from '../../components/ui/FormField';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useStore } from '../../store/useStore';
import { generateTrainingTemplateApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { TrainingTemplate } from '../../types';

type FormState = {
  name: string;
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  capacity: string;
  defaultPlan: string;
};

const emptyForm: FormState = {
  name: '',
  title: '',
  description: '',
  location: '',
  startTime: '18:30',
  endTime: '19:45',
  capacity: '24',
  defaultPlan: '',
};

function toForm(t: TrainingTemplate): FormState {
  return {
    name: t.name,
    title: t.title,
    description: t.description,
    location: t.location,
    startTime: t.startTime || '18:30',
    endTime: t.endTime || '19:45',
    capacity: t.capacity != null ? String(t.capacity) : '',
    defaultPlan: t.defaultPlan,
  };
}

function toPayload(form: FormState) {
  const capacityNum = Number(form.capacity);
  return {
    name: form.name.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    location: form.location.trim(),
    startTime: form.startTime,
    endTime: form.endTime,
    capacity: form.capacity.trim() && !Number.isNaN(capacityNum) ? capacityNum : null,
    defaultPlan: form.defaultPlan,
  };
}

export default function CoachTrainingTemplates() {
  const templates = useStore((s) => s.trainingTemplates);
  const createTemplate = useStore((s) => s.createTrainingTemplate);
  const updateTemplate = useStore((s) => s.updateTrainingTemplate);
  const removeTemplate = useStore((s) => s.deleteTrainingTemplate);
  const push = useStore((s) => s.pushToast);
  const authUserId = useStore((s) => s.authUser?.id ?? '');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState<TrainingTemplate | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const generate = async () => {
    setAiError(null);
    if (aiPrompt.trim().length < 3) {
      setAiError('Aprašykite treniruotę bent keliais žodžiais.');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateTrainingTemplateApi(aiPrompt.trim());
      setForm({
        name: result.name,
        title: result.title,
        description: result.description,
        location: result.location,
        startTime: result.startTime || emptyForm.startTime,
        endTime: result.endTime || emptyForm.endTime,
        capacity:
          result.capacity != null ? String(result.capacity) : emptyForm.capacity,
        defaultPlan: result.defaultPlan,
      });
      push({ kind: 'success', message: 'Planas sugeneruotas — patikrinkite ir išsaugokite.' });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Nepavyko sugeneruoti plano.';
      setAiError(message);
    } finally {
      setGenerating(false);
    }
  };

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => a.name.localeCompare(b.name, 'lt')),
    [templates],
  );

  const startCreate = () => {
    setEditingId(null);
    setCreating(true);
    setForm(emptyForm);
    setError(null);
    setAiPrompt('');
    setAiError(null);
  };

  const startEdit = (t: TrainingTemplate) => {
    setCreating(false);
    setEditingId(t.id);
    setForm(toForm(t));
    setError(null);
    setAiPrompt('');
    setAiError(null);
  };

  const cancelForm = () => {
    setEditingId(null);
    setCreating(false);
    setForm(emptyForm);
    setError(null);
    setAiPrompt('');
    setAiError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError('Įveskite plano pavadinimą.');
      return;
    }
    if (form.startTime >= form.endTime) {
      setError('Pabaigos laikas turi būti vėlesnis už pradžios.');
      return;
    }
    const payload = toPayload(form);
    setSubmitting(true);
    if (editingId) {
      const res = await updateTemplate(editingId, payload);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error ?? 'Nepavyko atnaujinti.');
        return;
      }
      push({ kind: 'success', message: 'Planas atnaujintas.' });
    } else {
      const res = await createTemplate(payload);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error ?? 'Nepavyko sukurti.');
        return;
      }
      push({ kind: 'success', message: 'Planas sukurtas.' });
    }
    cancelForm();
  };

  const formOpen = creating || editingId !== null;

  const tourEnabled = true;
  const tourStorageKey = `training_templates_tour_seen:${authUserId || 'anon'}`;
  const [runTour, setRunTour] = useState(false);
  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        'Sveiki! Čia kuriami treniruočių planai — daugkartiniai šablonai, kuriuos vėliau vienu paspaudimu pritaikysite konkrečiai treniruotei. Užpildysime pavyzdinę formą, o jūs galėsite ją pritaikyti savo klubui.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="ai-generator"]',
      content:
        'AI generatorius — aprašykite treniruotę laisva forma (pvz. „60 min sprinto technikos treniruotė vaikams stadione"), o dirbtinis intelektas užpildys visus laukus. Prieš išsaugant galėsite pakoreguoti.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="template-name"]',
      content:
        'Plano pavadinimas — vidinis vardas, matomas TIK jums renkantis planą (pvz. „Antradienio sprinto sesija"). Nariai jo nemato.',
    },
    {
      target: '[data-tour="training-title"]',
      content:
        'Treniruotės pavadinimas — tai jau MATO nariai, kai treniruotė sukuriama pagal šį planą. Turi būti aiškus ir suprantamas.',
    },
    {
      target: '[data-tour="description"]',
      content:
        'Aprašymas — ką nariai darys šioje treniruotėje. Padeda apsispręsti prieš registruojantis.',
    },
    {
      target: '[data-tour="location"]',
      content:
        'Įprasta vieta, kur vyksta ši treniruotė. Kurdami konkrečią treniruotę pagal šį planą, vietą galėsite pakeisti.',
    },
    {
      target: '[data-tour="times"]',
      content:
        'Įprasti pradžios ir pabaigos laikai. Šie laukai užsipildo automatiškai kurdami naują treniruotę — nebereikės kaskart vesti iš naujo.',
    },
    {
      target: '[data-tour="capacity"]',
      content:
        'Standartinė talpa — kiek narių gali užsiregistruoti. Pilnai užpildžius, kiti automatiškai patenka į laukiančiųjų sąrašą.',
    },
    {
      target: '[data-tour="default-plan"]',
      content:
        'Bendras planas — pratimai, apkrova ir eiliškumas. Kurdami treniruotę pagal šį šabloną, šis planas bus automatiškai priskirtas visiems dalyviams. Vėliau kiekvienam nariui galėsite pritaikyti individualų planą.',
      placement: 'top',
    },
    {
      target: '[data-tour="save"]',
      content:
        'Kai visi laukai užpildyti — paspauskite „Sukurti". Planas atsiras sąraše ir bus prieinamas kuriant treniruotes.',
      placement: 'top',
    },
    {
      target: '[data-tour="templates-list"]',
      content:
        'Čia matysite visus sukurtus planus. Kiekvieną galima redaguoti arba ištrinti. Kurdami naują treniruotę, planą pasirinksite iš išskleidžiamo sąrašo — laukai užsipildys automatiškai.',
      placement: 'top',
    },
  ];

  useEffect(() => {
    if (!tourEnabled) return;
    try {
      if (localStorage.getItem(tourStorageKey)) return;
    } catch {
      return;
    }
    // Open the form so the field targets exist, then start the tour.
    if (!formOpen) {
      setCreating(true);
      setForm(emptyForm);
    }
    const t = setTimeout(() => setRunTour(true), 100);
    return () => clearTimeout(t);
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

  return (
    <div>
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
          title="Treniruočių planai"
          description="Iš anksto paruošti šablonai — pasirinkę juos, greitai užpildysite naujos treniruotės laukus."
          action={
            !formOpen ? (
              <button type="button" className="btn-primary" onClick={startCreate}>
                <Plus className="h-4 w-4" /> Naujas planas
              </button>
            ) : undefined
          }
        />
      </div>

      {formOpen && (
        <section className="surface mb-4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">
              {editingId ? 'Redaguoti planą' : 'Naujas planas'}
            </h2>
            <button
              type="button"
              className="btn-ghost"
              onClick={cancelForm}
              aria-label="Uždaryti formą"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            className="mb-4 rounded-2xl border border-lime-200 bg-lime-50/60 p-3 dark:border-lime-900/60 dark:bg-lime-950/40"
            data-tour="ai-generator"
          >
            <div className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-lime-900 dark:text-lime-200">
              <Sparkles className="h-4 w-4" />
              Generuoti su AI
            </div>
            <p className="mb-2 text-xs text-ink-600 dark:text-ink-300">
              Aprašykite treniruotę laisva forma — AI užpildys visus laukus. Rezultatą galėsite pataisyti prieš išsaugant.
            </p>
            <TextareaField
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              placeholder="pvz. 60 min sprinto technikos treniruotė 12–14 m. vaikams stadione, akcentas — pirmieji 30 m."
            />
            {aiError && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{aiError}</p>
            )}
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="btn-accent"
                onClick={generate}
                disabled={generating}
              >
                <Sparkles className="h-4 w-4" />
                {generating ? 'Generuojama…' : 'Sugeneruoti'}
              </button>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div data-tour="template-name" className="sm:col-span-2">
                <FormField
                  label="Plano pavadinimas"
                  required
                  placeholder="pvz. Sprinto technika — pagrindinė"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  hint="Rodomas tik jums pasirenkant planą — nariai jo nemato."
                />
              </div>
              <div data-tour="training-title" className="sm:col-span-2">
                <FormField
                  label="Treniruotės pavadinimas"
                  placeholder="pvz. Sprinto technika"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div data-tour="description" className="sm:col-span-2">
                <TextareaField
                  label="Aprašymas"
                  placeholder="Ką nariai darys šioje treniruotėje?"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div data-tour="location" className="sm:col-span-2">
                <FormField
                  label="Vieta"
                  placeholder="pvz. Centrinis takas — A aikštė"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div data-tour="times">
                <FormField
                  label="Pradžios laikas"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <FormField
                label="Pabaigos laikas"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
              <div data-tour="capacity">
                <FormField
                  label="Talpa"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
            </div>
            <div data-tour="default-plan">
              <TextareaField
                label="Bendras planas"
                value={form.defaultPlan}
                onChange={(e) => setForm({ ...form, defaultPlan: e.target.value })}
                rows={10}
                placeholder="Apšilimas · Pagrindinė dalis · Atsipalaidavimas · Pastabos…"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={cancelForm}>
                Atšaukti
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                data-tour="save"
              >
                <Save className="h-4 w-4" />
                {editingId ? 'Išsaugoti' : 'Sukurti'}
              </button>
            </div>
          </form>
        </section>
      )}

      <div data-tour="templates-list">
      {sortedTemplates.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Kol kas planų nėra"
          description="Sukurkite planą — vėliau galėsite jį pasirinkti kurdami naują treniruotę, ir laukai bus užpildyti automatiškai."
        />
      ) : (
        <div className="grid gap-3">
          {sortedTemplates.map((t) => (
            <div key={t.id} className="surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-bold">{t.name}</h3>
                  {t.title && (
                    <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">
                      {t.title}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                    {t.location && <span>📍 {t.location}</span>}
                    {(t.startTime || t.endTime) && (
                      <span>
                        🕐 {t.startTime || '—'} – {t.endTime || '—'}
                      </span>
                    )}
                    {t.capacity != null && <span>👥 {t.capacity} vt.</span>}
                  </div>
                  {t.description && (
                    <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
                      {t.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => startEdit(t)}
                  >
                    Redaguoti
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setToDelete(t)}
                    aria-label="Ištrinti planą"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            removeTemplate(toDelete.id);
            push({ kind: 'info', message: 'Planas ištrintas.' });
          }
        }}
        title="Ištrinti planą?"
        message={
          toDelete
            ? `„${toDelete.name}“ bus pašalintas. Anksčiau sukurtos treniruotės liks nepakitusios.`
            : ''
        }
        destructive
        confirmLabel="Ištrinti"
      />
    </div>
  );
}
