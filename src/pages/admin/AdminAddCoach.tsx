import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, UserPlus } from "lucide-react";
import Joyride, {
  STATUS,
  type CallBackProps,
  type Step,
} from "react-joyride";
import { PageTitle } from "../../components/layout/PageTitle";
import { FormField } from "../../components/ui/FormField";
import { useStore } from "../../store/useStore";
import { createCoachApi } from "../../api/endpoints";
import { ApiError } from "../../api/client";

export default function AdminAddCoach() {
  const navigate = useNavigate();
  const push = useStore((s) => s.pushToast);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    specialty: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [runTour, setRunTour] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createCoachApi({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        specialty: form.specialty.trim() || undefined,
      });
      push({ kind: "success", message: "Treneris sukurtas." });
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nepavyko sukurti trenerio.");
    } finally {
      setSubmitting(false);
    }
  };

  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        "Naujo trenerio pridėjimas. Užpildžius šią formą, sistema iš karto sukurs trenerio paskyrą ir prisijungimą — treneris galės iškart prisijungti su nurodytu el. paštu ir slaptažodžiu.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="name"]',
      content:
        "Vardas ir pavardė — kaip trenerį matys jūsų klubo nariai treniruočių sąrašuose ir individualiuose planuose.",
    },
    {
      target: '[data-tour="email"]',
      content:
        "El. paštas — trenerio prisijungimo vardas. Turi būti unikalus (dar nenaudojamas kito Lumo vartotojo). Šiuo adresu galėsite susisiekti su treneriu.",
    },
    {
      target: '[data-tour="password"]',
      content:
        "Pradinis slaptažodis — bent 6 simboliai. Treneris juo prisijungs pirmą kartą ir galės pakeisti savo profilyje. Rekomenduojama nustatyti stiprų slaptažodį ir saugiai jį perduoti.",
    },
    {
      target: '[data-tour="specialty"]',
      content:
        "Specializacija (neprivaloma) — trumpas trenerio specializacijos aprašas (pvz. „Sprintas ir technika“, „Jėga“). Matoma nariams renkantis treniruotę.",
    },
    {
      target: '[data-tour="submit"]',
      content:
        "Paspaudus „Sukurti trenerį“, paskyra bus iš karto sukurta ir grįšite į administratoriaus skydelį. Naujas treneris atsiras Paskyrų sąraše ir galės iškart prisijungti.",
      placement: "top",
    },
  ];

  const handleTourCallback = (data: CallBackProps) => {
    const done: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (done.includes(data.status)) {
      setRunTour(false);
    }
  };

  return (
    <div className="max-w-2xl">
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
      <div data-tour="page-title">
        <PageTitle
          eyebrow="Administratorius"
          title="Pridėti trenerį"
          description="Sukuriama trenerio paskyra ir prisijungimas."
          backTo="/admin"
          action={
            <button
              type="button"
              className="btn-ghost h-9 px-3 text-xs"
              onClick={() => setRunTour(true)}
            >
              <BookOpen className="h-4 w-4" />
              Interaktyvus vadovas
            </button>
          }
        />
      </div>

      <form onSubmit={submit} className="surface space-y-4 p-4">
        <div data-tour="name">
          <FormField
            label="Vardas ir pavardė"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="pvz. Elena Ruiz"
          />
        </div>
        <div data-tour="email">
          <FormField
            label="El. paštas"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="treneris@pavyzdys.lt"
          />
        </div>
        <div data-tour="password">
          <FormField
            label="Pradinis slaptažodis"
            type="text"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint="Bent 6 simboliai. Treneris galės jį pakeisti vėliau."
          />
        </div>
        <div data-tour="specialty">
          <FormField
            label="Specializacija"
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            placeholder="pvz. Sprintas ir technika"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => navigate("/admin")}>
            Atšaukti
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            data-tour="submit"
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? "Kuriama…" : "Sukurti trenerį"}
          </button>
        </div>
      </form>
    </div>
  );
}
