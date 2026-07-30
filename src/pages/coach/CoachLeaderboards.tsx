import { useState } from "react";
import { Link } from "react-router-dom";
import { Archive, ChevronRight, Plus, Trophy } from "lucide-react";
import { useStore } from "../../store/useStore";
import { PageTitle } from "../../components/layout/PageTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { FormField, SelectField } from "../../components/ui/FormField";
import type { LeaderboardCategory } from "../../types";
import { formatResult } from "../../utils/format";

export default function CoachLeaderboards() {
  const categories = useStore((s) => s.leaderboardCategories);
  const results = useStore((s) => s.leaderboardResults);
  const addCategory = useStore((s) => s.addLeaderboardCategory);
  const archive = useStore((s) => s.archiveLeaderboardCategory);
  const push = useStore((s) => s.pushToast);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<LeaderboardCategory, "id">>({
    name: "",
    event: "",
    measurementType: "seconds",
    unit: "s",
    lowerIsBetter: true,
    genderCategory: "all",
    archived: false,
  });

  const active = categories.filter((c) => !c.archived);
  const archived = categories.filter((c) => c.archived);

  const create = () => {
    if (!draft.name.trim() || !draft.event.trim()) return;
    addCategory(draft);
    push({
      kind: "success",
      message: "Rezultatų lentelės kategorija sukurta.",
    });
    setOpen(false);
    setDraft({
      name: "",
      event: "",
      measurementType: "seconds",
      unit: "s",
      lowerIsBetter: true,
      genderCategory: "all",
      archived: false,
    });
  };

  return (
    <div>
      <PageTitle
        eyebrow="Treneris"
        title="Rezultatų lentelės"
        description="Kurkite kategorijas ir tvarkykite rezultatus."
        action={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nauja rezultatų lentelė
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((c) => {
          const total = results.filter((r) => r.categoryId === c.id).length;
          const top = results
            .filter((r) => r.categoryId === c.id)
            .sort((a, b) =>
              c.lowerIsBetter ? a.value - b.value : b.value - a.value,
            )[0];
          return (
            <Link
              key={c.id}
              to={`/coach/leaderboards/${c.id}`}
              className="group surface flex flex-col p-4 hover:shadow-card"
            >
              <div className="mb-2 flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-200">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {c.event}
                  </p>
                  <p className="font-display text-base font-bold">{c.name}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-ink-400" />
              </div>
              <div className="mt-auto flex items-center justify-between text-xs text-ink-500">
                <span>Rezultatų: {total}</span>
                <span className="font-semibold">
                  Geriausias {top ? formatResult(top.value, c) : "—"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <StatusBadge tone="neutral">
                  {c.genderCategory === "all"
                    ? "Visi nariai"
                    : c.genderCategory === "male"
                      ? "Vyrai"
                      : "Moterys"}
                </StatusBadge>
                <StatusBadge tone="info">
                  {c.lowerIsBetter ? "Mažiau — geriau" : "Daugiau — geriau"}
                </StatusBadge>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  archive(c.id);
                  push({
                    kind: "info",
                    message: "Rezultatų lentelė archyvuota.",
                  });
                }}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-800"
              >
                <Archive className="h-3 w-3" /> Archyvuoti
              </button>
            </Link>
          );
        })}
      </div>

      {archived.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
            Archyvuota
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((c) => (
              <div
                key={c.id}
                className="surface flex items-center justify-between p-3 opacity-70"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {c.event}
                  </p>
                  <p className="text-sm font-semibold">{c.name}</p>
                </div>
                <StatusBadge tone="neutral">Archyvuota</StatusBadge>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Sukurti rezultatų lentelės kategoriją"
        description="Kategorijos gali būti susietos su rungtimi ir lytimi."
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Atšaukti
            </button>
            <button className="btn-primary" onClick={create}>
              Sukurti kategoriją
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label="Pavadinimas"
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <FormField
            label="Rungtis"
            required
            placeholder="pvz. 100 m"
            value={draft.event}
            onChange={(e) => setDraft({ ...draft, event: e.target.value })}
          />
          <SelectField
            label="Matavimo tipas"
            value={draft.measurementType}
            onChange={(e) => {
              const v = e.target
                .value as LeaderboardCategory["measurementType"];
              const unit =
                v === "seconds"
                  ? "s"
                  : v === "ms"
                    ? "ms"
                    : v === "distance_km"
                      ? "km"
                      : "pts";
              setDraft({
                ...draft,
                measurementType: v,
                unit,
                lowerIsBetter: v === "seconds" || v === "ms",
              });
            }}
          >
            <option value="seconds">Sekundės</option>
            <option value="ms">Milisekundės</option>
            <option value="distance_km">Atstumas (km)</option>
            <option value="points">Taškai</option>
          </SelectField>
          <SelectField
            label="Kryptis"
            value={draft.lowerIsBetter ? "lower" : "higher"}
            onChange={(e) =>
              setDraft({ ...draft, lowerIsBetter: e.target.value === "lower" })
            }
          >
            <option value="lower">Mažiau — geriau</option>
            <option value="higher">Daugiau — geriau</option>
          </SelectField>
          <SelectField
            label="Lyties kategorija"
            value={draft.genderCategory}
            onChange={(e) =>
              setDraft({ ...draft, genderCategory: e.target.value as any })
            }
          >
            <option value="all">Visi</option>
            <option value="male">Vyrai</option>
            <option value="female">Moterys</option>
          </SelectField>
        </div>
      </Modal>
    </div>
  );
}
