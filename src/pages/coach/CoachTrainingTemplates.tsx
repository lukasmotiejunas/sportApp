import { useMemo, useState } from 'react';
import { ClipboardList, Plus, Save, Trash2, X } from 'lucide-react';
import { PageTitle } from '../../components/layout/PageTitle';
import { FormField, TextareaField } from '../../components/ui/FormField';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useStore } from '../../store/useStore';
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState<TrainingTemplate | null>(null);

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => a.name.localeCompare(b.name, 'lt')),
    [templates],
  );

  const startCreate = () => {
    setEditingId(null);
    setCreating(true);
    setForm(emptyForm);
    setError(null);
  };

  const startEdit = (t: TrainingTemplate) => {
    setCreating(false);
    setEditingId(t.id);
    setForm(toForm(t));
    setError(null);
  };

  const cancelForm = () => {
    setEditingId(null);
    setCreating(false);
    setForm(emptyForm);
    setError(null);
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

  return (
    <div>
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
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Plano pavadinimas"
                required
                placeholder="pvz. Sprinto technika — pagrindinė"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="sm:col-span-2"
                hint="Rodomas tik jums pasirenkant planą — nariai jo nemato."
              />
              <FormField
                label="Treniruotės pavadinimas"
                placeholder="pvz. Sprinto technika"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="sm:col-span-2"
              />
              <TextareaField
                label="Aprašymas"
                placeholder="Ką nariai darys šioje treniruotėje?"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="sm:col-span-2"
              />
              <FormField
                label="Vieta"
                placeholder="pvz. Centrinis takas — A aikštė"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="sm:col-span-2"
              />
              <FormField
                label="Pradžios laikas"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
              <FormField
                label="Pabaigos laikas"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
              <FormField
                label="Talpa"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
            <TextareaField
              label="Bendras planas"
              value={form.defaultPlan}
              onChange={(e) => setForm({ ...form, defaultPlan: e.target.value })}
              rows={10}
              placeholder="Apšilimas · Pagrindinė dalis · Atsipalaidavimas · Pastabos…"
            />
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
              >
                <Save className="h-4 w-4" />
                {editingId ? 'Išsaugoti' : 'Sukurti'}
              </button>
            </div>
          </form>
        </section>
      )}

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
