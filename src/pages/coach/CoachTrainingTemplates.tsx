import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import Joyride, { STATUS, type CallBackProps, type Step } from 'react-joyride';
import { useTranslation } from 'react-i18next';
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

function toForm(tmpl: TrainingTemplate): FormState {
  return {
    name: tmpl.name,
    title: tmpl.title,
    description: tmpl.description,
    location: tmpl.location,
    startTime: tmpl.startTime || '18:30',
    endTime: tmpl.endTime || '19:45',
    capacity: tmpl.capacity != null ? String(tmpl.capacity) : '',
    defaultPlan: tmpl.defaultPlan,
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
  const { t } = useTranslation();
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
      setAiError(t('coach_templates.ai_error_short'));
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
      push({ kind: 'success', message: t('coach_templates.ai_generated') });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t('coach_templates.ai_error_generic');
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

  const startEdit = (tmpl: TrainingTemplate) => {
    setCreating(false);
    setEditingId(tmpl.id);
    setForm(toForm(tmpl));
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
      setError(t('coach_templates.error_name'));
      return;
    }
    if (form.startTime >= form.endTime) {
      setError(t('coach_templates.error_time'));
      return;
    }
    const payload = toPayload(form);
    setSubmitting(true);
    if (editingId) {
      const res = await updateTemplate(editingId, payload);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error ?? t('coach_templates.error_save'));
        return;
      }
      push({ kind: 'success', message: t('coach_templates.saved') });
    } else {
      const res = await createTemplate(payload);
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error ?? t('coach_templates.error_create'));
        return;
      }
      push({ kind: 'success', message: t('coach_templates.created') });
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
    const timer = setTimeout(() => setRunTour(true), 100);
    return () => clearTimeout(timer);
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
      )}
      <div data-tour="page-title">
        <PageTitle
          title={t('coach_templates.title')}
          description={t('coach_templates.description')}
          action={
            !formOpen ? (
              <button type="button" className="btn-primary" onClick={startCreate}>
                <Plus className="h-4 w-4" /> {t('coach_templates.new')}
              </button>
            ) : undefined
          }
        />
      </div>

      {formOpen && (
        <section className="surface mb-4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">
              {editingId ? t('coach_templates.form_edit') : t('coach_templates.form_new')}
            </h2>
            <button
              type="button"
              className="btn-ghost"
              onClick={cancelForm}
              aria-label={t('coach_templates.close_form')}
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
              {t('coach_templates.ai_title')}
            </div>
            <p className="mb-2 text-xs text-ink-600 dark:text-ink-300">
              {t('coach_templates.ai_desc')}
            </p>
            <TextareaField
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              placeholder={t('coach_templates.ai_placeholder')}
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
                {generating ? t('coach_templates.ai_generating') : t('coach_templates.ai_generate')}
              </button>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div data-tour="template-name" className="sm:col-span-2">
                <FormField
                  label={t('coach_templates.name_label')}
                  required
                  placeholder={t('coach_templates.name_placeholder')}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  hint={t('coach_templates.name_hint')}
                />
              </div>
              <div data-tour="training-title" className="sm:col-span-2">
                <FormField
                  label={t('coach_templates.training_title_label')}
                  placeholder={t('coach_templates.training_title_placeholder')}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div data-tour="description" className="sm:col-span-2">
                <TextareaField
                  label={t('coach_templates.description_label')}
                  placeholder={t('coach_templates.description_placeholder')}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div data-tour="location" className="sm:col-span-2">
                <FormField
                  label={t('coach_templates.location_label')}
                  placeholder={t('coach_templates.location_placeholder')}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div data-tour="times">
                <FormField
                  label={t('coach_templates.start_time_label')}
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <FormField
                label={t('coach_templates.end_time_label')}
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
              <div data-tour="capacity">
                <FormField
                  label={t('coach_templates.capacity_label')}
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
            </div>
            <div data-tour="default-plan">
              <TextareaField
                label={t('coach_templates.plan_label')}
                value={form.defaultPlan}
                onChange={(e) => setForm({ ...form, defaultPlan: e.target.value })}
                rows={10}
                placeholder={t('coach_templates.plan_placeholder')}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={cancelForm}>
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                data-tour="save"
              >
                <Save className="h-4 w-4" />
                {editingId ? t('coach_templates.save_btn') : t('coach_templates.create_btn')}
              </button>
            </div>
          </form>
        </section>
      )}

      <div data-tour="templates-list">
      {sortedTemplates.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t('coach_templates.empty')}
          description={t('coach_templates.empty_desc')}
        />
      ) : (
        <div className="grid gap-3">
          {sortedTemplates.map((tmpl) => (
            <div key={tmpl.id} className="surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-bold">{tmpl.name}</h3>
                  {tmpl.title && (
                    <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">
                      {tmpl.title}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                    {tmpl.location && <span>📍 {tmpl.location}</span>}
                    {(tmpl.startTime || tmpl.endTime) && (
                      <span>
                        🕐 {tmpl.startTime || '—'} – {tmpl.endTime || '—'}
                      </span>
                    )}
                    {tmpl.capacity != null && <span>👥 {tmpl.capacity} {t('coach_templates.slots_abbrev')}</span>}
                  </div>
                  {tmpl.description && (
                    <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
                      {tmpl.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => startEdit(tmpl)}
                  >
                    {t('coach_templates.edit')}
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setToDelete(tmpl)}
                    aria-label={t('coach_templates.delete')}
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
            push({ kind: 'info', message: t('coach_templates.deleted') });
          }
        }}
        title={t('coach_templates.delete_confirm')}
        message={
          toDelete
            ? t('coach_templates.delete_confirm_msg', { name: toDelete.name })
            : ''
        }
        destructive
        confirmLabel={t('coach_templates.delete')}
      />
    </div>
  );
}
