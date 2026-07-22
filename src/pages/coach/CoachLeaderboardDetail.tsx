import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PageTitle } from '../../components/layout/PageTitle';
import { Avatar } from '../../components/ui/Avatar';
import { LeaderboardRow } from '../../components/leaderboard/LeaderboardRow';
import { Modal } from '../../components/ui/Modal';
import { FormField, SelectField, TextareaField } from '../../components/ui/FormField';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDateShort, todayIso } from '../../utils/dates';
import { formatResult } from '../../utils/format';
import type { LeaderboardResult } from '../../types';

export default function CoachLeaderboardDetail() {
  const { id = '' } = useParams();
  const category = useStore((s) => s.leaderboardCategories.find((c) => c.id === id));
  const results = useStore((s) => s.leaderboardResults);
  const members = useStore((s) => s.members);
  const addResult = useStore((s) => s.addLeaderboardResult);
  const updateResult = useStore((s) => s.updateLeaderboardResult);
  const removeResult = useStore((s) => s.removeLeaderboardResult);
  const push = useStore((s) => s.pushToast);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<LeaderboardResult | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    memberId: members[0]?.id ?? '',
    valueRaw: '',
    date: todayIso(),
    note: '',
  });

  const ranked = useMemo(() => {
    if (!category) return [];
    const list = results
      .filter((r) => r.categoryId === category.id)
      .sort((a, b) => (category.lowerIsBetter ? a.value - b.value : b.value - a.value));
    return list.map((r, i) => ({ rank: i + 1, r, m: members.find((x) => x.id === r.memberId) }));
  }, [category, results, members]);

  if (!category) {
    return (
      <div>
        <PageTitle title="Kategorija nerasta" backTo="/coach/leaderboards" />
      </div>
    );
  }

  const parseValue = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (category.measurementType === 'seconds' || category.measurementType === 'ms') {
      // support mm:ss or seconds
      if (trimmed.includes(':')) {
        const [m, s] = trimmed.split(':').map((x) => Number(x));
        if (isNaN(m) || isNaN(s)) return null;
        return m * 60 + s;
      }
    }
    const v = Number(trimmed);
    return isNaN(v) ? null : v;
  };

  const submitAdd = () => {
    const v = parseValue(draft.valueRaw);
    if (v == null) {
      push({ kind: 'error', message: 'Įveskite galiojančią rezultato reikšmę.' });
      return;
    }
    addResult({
      categoryId: category.id,
      memberId: draft.memberId,
      value: v,
      date: draft.date,
      note: draft.note || undefined,
    });
    push({ kind: 'success', message: 'Rezultatas pridėtas — reitingas atnaujintas.' });
    setAddOpen(false);
    setDraft({ ...draft, valueRaw: '', note: '' });
  };

  return (
    <div>
      <PageTitle
        eyebrow={category.event}
        title={category.name}
        description={`Stebimų rezultatų: ${ranked.length} · ${category.lowerIsBetter ? 'greičiausias laimi' : 'daugiausiai laimi'}`}
        backTo="/coach/leaderboards"
        action={
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Pridėti rezultatą
          </button>
        }
      />

      <section className="surface">
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wider text-ink-500 dark:bg-ink-900">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Narys</th>
                <th className="px-4 py-2">Rezultatas</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2 text-right">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {ranked.map(({ rank, r, m }) => (
                m && (
                  <tr key={r.id} className="bg-white dark:bg-ink-900">
                    <td className="px-4 py-3 font-bold">{rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={m.name} color={m.avatarColor} size="sm" />
                        <div>
                          <p className="text-sm font-semibold">{m.name}</p>
                          <p className="text-xs text-ink-500">{m.ageGroup}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-display text-base font-bold tabular-nums">
                      {formatResult(r.value, category)}
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{formatDateShort(r.date)}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-ghost h-8 px-2 text-xs" onClick={() => setEditing(r)} aria-label="Redaguoti rezultatą">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button className="btn-ghost h-8 px-2 text-xs text-red-600" onClick={() => setToDelete(r.id)} aria-label="Ištrinti rezultatą">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>

        <ul className="space-y-2 p-3 md:hidden">
          {ranked.map(({ rank, r, m }) => m && (
            <li key={r.id}>
              <LeaderboardRow rank={rank} result={r} member={m} category={category} />
            </li>
          ))}
        </ul>
      </section>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Pridėti rezultatą"
        description="Reitingas perskaičiuojamas automatiškai."
        footer={
          <>
            <button className="btn-ghost" onClick={() => setAddOpen(false)}>Atšaukti</button>
            <button className="btn-primary" onClick={submitAdd}>Išsaugoti rezultatą</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Narys" value={draft.memberId} onChange={(e) => setDraft({ ...draft, memberId: e.target.value })}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </SelectField>
          <FormField
            label="Data"
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />
          <FormField
            label={`Rezultatas (${category.unit === 's' ? 'sekundės arba mm:ss' : category.unit})`}
            placeholder={category.measurementType === 'seconds' ? '11.42 arba 18:42' : ''}
            required
            value={draft.valueRaw}
            onChange={(e) => setDraft({ ...draft, valueRaw: e.target.value })}
            className="sm:col-span-2"
          />
          <TextareaField label="Užrašas (nebūtinas)" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className="sm:col-span-2" />
        </div>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Redaguoti rezultatą"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditing(null)}>Atšaukti</button>
            <button
              className="btn-primary"
              onClick={() => {
                if (editing) {
                  updateResult(editing.id, editing);
                  push({ kind: 'success', message: 'Rezultatas atnaujintas.' });
                }
                setEditing(null);
              }}
            >
              Išsaugoti pakeitimus
            </button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Rezultatas"
              type="number"
              step="0.01"
              value={editing.value}
              onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })}
              className="sm:col-span-2"
            />
            <FormField label="Data" type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            removeResult(toDelete);
            push({ kind: 'info', message: 'Rezultatas pašalintas.' });
          }
        }}
        title="Pašalinti šį rezultatą?"
        message="Reitingas bus perskaičiuotas nedelsiant."
        confirmLabel="Pašalinti rezultatą"
        destructive
      />
    </div>
  );
}
