import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, ChevronRight, Plus, Trophy } from "lucide-react";
import Joyride, {
  ACTIONS,
  EVENTS,
  STATUS,
  type CallBackProps,
  type Step,
} from "react-joyride";
import { useStore } from "../../store/useStore";
import { PageTitle } from "../../components/layout/PageTitle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { FormField, SelectField } from "../../components/ui/FormField";
import type { LeaderboardCategory } from "../../types";
import { formatResult } from "../../utils/format";
import { useLeaderboardsBase } from "../../utils/roleContext";

export default function CoachLeaderboards() {
  const { base, eyebrow } = useLeaderboardsBase();
  const categories = useStore((s) => s.leaderboardCategories);
  const results = useStore((s) => s.leaderboardResults);
  const addCategory = useStore((s) => s.addLeaderboardCategory);
  const archive = useStore((s) => s.archiveLeaderboardCategory);
  const push = useStore((s) => s.pushToast);
  const authUserId = useStore((s) => s.authUser?.id ?? "");

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

  const tourEnabled = true;
  const tourStorageKey = `leaderboards_tour_seen:${authUserId || "anon"}`;
  const [runTour, setRunTour] = useState(false);
  const MODAL_FIRST_STEP = 3;
  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        "Sveiki! Rezultatų lentelės — čia sekami klubo narių pasiekimai pagal rungtis (pvz. 100 m sprintas, štangos spaudimas). Parodysime, kaip veikia kategorijos ir kaip sukurti pirmąją.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="new-btn"]',
      content:
        "Kiekviena rezultatų lentelė yra atskira kategorija — pvz. „100 m — vyrai“. Paspauskite šį mygtuką, kad sukurtumėte naują (tuoj automatiškai atversime formą, kad parodytume laukus).",
    },
    {
      target: '[data-tour="list"]',
      content:
        "Čia matote visas aktyvias rezultatų lenteles. Paspaudę ant kortelės — pateksite į lentelės detales, kur galėsite pridėti narių rezultatus. Kortelėje matomas rezultatų skaičius ir šiuo metu geriausias pasiekimas.",
      placement: "top",
    },
    {
      target: '[data-tour="modal-name"]',
      content:
        "Pavadinimas — kaip vadinsis lentelė (pvz. „100 m — vyrai“ arba „Štangos spaudimas — visi“). Trumpas ir aiškus, kad nariai iš karto suprastų.",
    },
    {
      target: '[data-tour="modal-event"]',
      content:
        "Rungtis — konkreti disciplina (pvz. „100 m“, „5 km“, „Štangos spaudimas“). Ši informacija rodoma kortelės viršuje.",
    },
    {
      target: '[data-tour="modal-measurement"]',
      content:
        "Matavimo tipas — kokiais vienetais matuosite rezultatą: sekundės, minutės, metrai, kilometrai ar kilogramai. Nuo šio pasirinkimo priklauso, kaip rezultatai bus rodomi ir kaip skaičiuojama „geriausias“.",
    },
    {
      target: '[data-tour="modal-direction"]',
      content:
        "Kryptis — kada rezultatas geresnis: kai jis mažesnis (bėgimo laikas) ar didesnis (svoris, atstumas). Sistema pati parenka pagal matavimo tipą, bet galite pakeisti.",
    },
    {
      target: '[data-tour="modal-gender"]',
      content:
        "Lyties kategorija — ar lentelė bendra, ar atskira vyrams/moterims. Filtruoja, kurie nariai gali įrašyti rezultatą.",
    },
    {
      target: '[data-tour="modal-submit"]',
      content:
        "Užpildę visus laukus paspauskite „Sukurti kategoriją“. Ji atsiras aktyvių lentelių sąraše ir bus paruošta rezultatams.",
    },
  ];

  useEffect(() => {
    if (!tourEnabled) return;
    try {
      if (localStorage.getItem(tourStorageKey)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setRunTour(true), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourEnabled]);

  const handleTourCallback = (data: CallBackProps) => {
    const done: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (done.includes(data.status)) {
      setRunTour(false);
      setOpen(false);
      try {
        localStorage.setItem(tourStorageKey, "1");
      } catch {
        // ignore
      }
      return;
    }
    if (data.type === EVENTS.STEP_AFTER) {
      // Advancing into the modal: open it so the form fields exist.
      if (
        data.action === ACTIONS.NEXT &&
        data.index === MODAL_FIRST_STEP - 1
      ) {
        setOpen(true);
      }
      // Stepping back out of the modal: close it again.
      if (
        data.action === ACTIONS.PREV &&
        data.index === MODAL_FIRST_STEP
      ) {
        setOpen(false);
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
            back: "Atgal",
            close: "Uždaryti",
            last: "Baigti",
            next: "Toliau",
            skip: "Praleisti",
          }}
          styles={{
            options: {
              primaryColor: "#5da004",
              zIndex: 10000,
            },
          }}
        />
      )}
      <div data-tour="page-title">
        <PageTitle
          eyebrow={eyebrow}
          title="Rezultatų lentelės"
          description="Kurkite kategorijas ir tvarkykite rezultatus."
          action={
            <button
              className="btn-primary"
              onClick={() => setOpen(true)}
              data-tour="new-btn"
            >
              <Plus className="h-4 w-4" /> Nauja rezultatų lentelė
            </button>
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-tour="list">
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
              to={`${base}/${c.id}`}
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
            <button
              className="btn-primary"
              onClick={create}
              data-tour="modal-submit"
            >
              Sukurti kategoriją
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div data-tour="modal-name">
            <FormField
              label="Pavadinimas"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div data-tour="modal-event">
            <FormField
              label="Rungtis"
              required
              placeholder="pvz. 100 m"
              value={draft.event}
              onChange={(e) => setDraft({ ...draft, event: e.target.value })}
            />
          </div>
          <div data-tour="modal-measurement">
            <SelectField
              label="Matavimo tipas"
              value={draft.measurementType}
              onChange={(e) => {
                const v = e.target
                  .value as LeaderboardCategory["measurementType"];
                const unit =
                  v === "seconds"
                    ? "s"
                    : v === "distance_km"
                      ? "km"
                      : v === "distance_m"
                        ? "m"
                        : v === "minutes"
                          ? "min"
                          : "kg";
                setDraft({
                  ...draft,
                  measurementType: v,
                  unit,
                  lowerIsBetter: v === "seconds" || v === "minutes",
                });
              }}
            >
              <option value="seconds">Sekundės</option>
              <option value="distance_km">Atstumas (km)</option>
              <option value="distance_m">Atstumas (m)</option>
              <option value="minutes">Minutės</option>
              <option value="kg">kg</option>
            </SelectField>
          </div>
          <div data-tour="modal-direction">
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
          </div>
          <div data-tour="modal-gender">
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
        </div>
      </Modal>
    </div>
  );
}
