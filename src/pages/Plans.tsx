import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CreditCard,
  Sparkles,
  Users,
  Trophy,
  CalendarDays,
  ShieldCheck,
  Copy,
  ChevronLeft,
  Lock,
} from "lucide-react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { signupApi, type SignupResult } from "../api/signup";
import { ApiError } from "../api/client";
import { getStripePromise } from "../utils/stripe";

const MONTHLY_FEE = 0.5;

const FEATURES: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}[] = [
  {
    icon: Users,
    title: "Neribotai narių ir trenerių",
    text: "Pridėkite visą klubo komandą — narius, trenerius ir administratorius vienoje sistemoje.",
  },
  {
    icon: CalendarDays,
    title: "Treniruočių planavimas",
    text: "Kurkite treniruočių tvarkaraščius, priimkite registracijas ir sekite lankomumą.",
  },
  {
    icon: Trophy,
    title: "Rezultatai ir lyderių lentelės",
    text: "Fiksuokite rezultatus pagal rungtis, palyginkite narių pažangą, motyvuokite konkurencija.",
  },
  {
    icon: CreditCard,
    title: "Narystės ir mokėjimai",
    text: "Sekite narystės mokesčius, priminkite apie skolas ir stebėkite klubo pajamas.",
  },
  {
    icon: ShieldCheck,
    title: "Atskiri prisijungimai kiekvienam",
    text: "Nariai mato tik savo duomenis, treneriai — savo grupes, jūs — visą klubą.",
  },
  {
    icon: Sparkles,
    title: "Nuolat tobulinama",
    text: "Reguliarūs atnaujinimai be papildomų mokesčių. Jūsų klubui — naujos funkcijos kiekvieną mėnesį.",
  },
];

const INCLUDED: string[] = [
  "Neriboto narių, trenerių ir treniruočių skaičius",
  "Treniruočių tvarkaraštis ir registracijos",
  "Individualūs treniruočių planai nariams",
  "Lyderių lentelės pagal rungtis",
  "Narystės mokesčių valdymas",
  "El. pašto priminimai nariams",
  "Techninė pagalba lietuviškai",
  "Automatiniai duomenų atsarginiai kopijos",
  "Galimybė bet kada atsisakyti prenumeratos",
];

type InfoForm = {
  clubName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

const initialInfo: InfoForm = {
  clubName: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("lt-LT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatPrice(v: number): string {
  return v.toLocaleString("lt-LT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

type Step = "landing" | "info" | "payment" | "success";

export default function Plans() {
  const [info, setInfo] = useState<InfoForm>(initialInfo);
  const [step, setStep] = useState<Step>("landing");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SignupResult | null>(null);
  const [savedPassword, setSavedPassword] = useState<string>("");

  const startSignup = () => {
    setStep("info");
    setError(null);
  };

  const setField = <K extends keyof InfoForm>(key: K, value: InfoForm[K]) =>
    setInfo((prev) => ({ ...prev, [key]: value }));

  // Step 1 submit: create club + Stripe subscription, get PaymentIntent secret.
  const submitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await signupApi({
        clubName: info.clubName.trim(),
        adminName: info.adminName.trim(),
        adminEmail: info.adminEmail.trim(),
        adminPassword: info.adminPassword,
      });
      setSavedPassword(info.adminPassword);
      setResult(res);
      setStep("payment");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Nepavyko sukurti klubo. Bandykite dar kartą.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Rough "next charge" preview shown on the signup steps — 14 days out to
  // match the trial. The authoritative next-charge date comes from the server.
  const nextChargeDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString("lt-LT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  if (step === "success" && result) {
    return <SuccessScreen result={result} password={savedPassword} />;
  }

  if (step === "payment" && result) {
    return (
      <PaymentStep
        clientSecret={result.clientSecret}
        nextChargeDate={nextChargeDate}
        onSuccess={() => setStep("success")}
        onBack={() => setStep("info")}
      />
    );
  }

  if (step === "info") {
    return (
      <InfoStep
        info={info}
        setField={setField}
        submit={submitInfo}
        submitting={submitting}
        error={error}
        nextChargeDate={nextChargeDate}
        onBack={() => setStep("landing")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="hero-gradient absolute inset-0 -z-10" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <Link to="/" className="flex items-center gap-2">
          <img src="/lumo-logo.png" alt="Lumo" className="h-8 w-auto" />
        </Link>
        <Link
          to="/login"
          className="text-sm font-semibold text-white/70 hover:text-white"
        >
          Prisijungti
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        <section className="grid gap-10 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-lime-300">
              <Sparkles className="h-3.5 w-3.5" /> Sportui gimusi platforma
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Vieninga sistema jūsų sporto klubui.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/70">
              Nariai, treniruotės, mokėjimai ir rezultatai vienoje vietoje.
              Pirmos <strong>2 savaitės — nemokamai</strong>, o po to vos{" "}
              <strong>{formatPrice(MONTHLY_FEE)} per mėnesį</strong> už visą klubą.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={startSignup}
                className="btn-accent group h-12 px-6 text-base"
              >
                Išbandyti nemokamai 2 savaites
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a
                href="#kaina"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-6 text-base font-semibold text-white hover:bg-white/5"
              >
                Sužinoti daugiau
              </a>
            </div>
            <p className="mt-3 text-xs text-white/50">
              Jokių slaptų mokesčių. Bet kada galėsite atsisakyti prenumeratos.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-lime-400/20 blur-3xl" aria-hidden />
            <div className="surface relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white shadow-pop backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-lime-300">
                <Sparkles className="h-3.5 w-3.5" /> Mėnesio prenumerata
              </div>
              <p className="mt-3 font-display text-2xl font-bold">
                {formatPrice(MONTHLY_FEE)} / mėn.
              </p>
              <p className="mt-1 text-sm text-white/70">
                Vienoda kaina visam klubui. Bet kada galima atsisakyti.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {INCLUDED.slice(0, 5).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                    <span className="text-white/80">{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={startSignup}
                className="btn-accent mt-6 w-full h-11"
              >
                Prenumeruoti
              </button>
            </div>
          </div>
        </section>

        <section className="py-12">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Ką gausite savo klube.
          </h2>
          <p className="mt-2 max-w-2xl text-white/70">
            Viskas, ko reikia klubui valdyti — nuo treniruočių iki mokėjimų.
            Nereikia atskirų įrankių ar Excel lentelių.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/15 text-lime-300">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-white/70">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="kaina" className="py-12">
          <div className="mx-auto max-w-3xl rounded-3xl border border-lime-400/30 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 sm:p-10">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-lime-300">
                Klubo prenumerata
              </span>
              <h3 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
                Viena kaina — viskas įskaičiuota.
              </h3>
              <div className="mt-6 flex items-end justify-center gap-2">
                <span className="font-display text-6xl font-bold">
                  {formatPrice(MONTHLY_FEE)}
                </span>
                <span className="mb-2 text-lg text-white/60">/ mėn.</span>
              </div>
              <p className="mt-2 text-sm text-white/70">
                Pirmos 2 savaitės — nemokamai. Po to prenumerata automatiškai
                kartojasi kas mėnesį, kol atšauksite.
              </p>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-white/80"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                onClick={startSignup}
                className="btn-accent h-12 w-full max-w-sm px-6 text-base"
              >
                Išbandyti nemokamai 2 savaites
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-white/50">
                Šiandien nieko neapmokestiname. Bet kada galite atsisakyti prenumeratos.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Dažni klausimai.
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Faq
              q="Kada bus nurašytas pirmas mokėjimas?"
              a={`Pirmos 2 savaitės — nemokamai. Registracijos metu tik įvesite kortelės duomenis, tačiau šiandien nieko neapmokestiname. Praėjus 14 dienų, kortelė bus automatiškai apmokestinama ${formatPrice(MONTHLY_FEE)}.`}
            />
            <Faq
              q="Kas nutinka kas mėnesį?"
              a={`Kai baigsis nemokamas laikotarpis, kiekvieno mėnesio tą pačią dieną kortelė bus automatiškai apmokestinama ${formatPrice(MONTHLY_FEE)}. Mokestis kartojasi tol, kol atšauksite prenumeratą.`}
            />
            <Faq
              q="Ar galiu atsisakyti bet kada?"
              a="Taip. Prenumeratą galite nutraukti bet kada iš savo klubo administravimo skydelio — jokių baudų ar minimalaus termino. Turėsite prieigą iki apmokėto laikotarpio pabaigos."
            />
            <Faq
              q="Kiek narių galiu turėti?"
              a={`Neribotai. ${formatPrice(MONTHLY_FEE)} per mėnesį — už visą klubą, nesvarbu, ar turite 20, ar 500 narių.`}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-white/50 sm:px-10">
          <div>© {new Date().getFullYear()} Lumo</div>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-white">
              Paslaugų sąlygos
            </Link>
            <Link to="/privacy" className="hover:text-white">
              Privatumo politika
            </Link>
            <Link to="/login" className="hover:text-white">
              Prisijungti
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h4 className="font-display text-base font-bold">{q}</h4>
      <p className="mt-2 text-sm text-white/70">{a}</p>
    </div>
  );
}

type SetInfo = <K extends keyof InfoForm>(key: K, value: InfoForm[K]) => void;

function InfoStep(props: {
  info: InfoForm;
  setField: SetInfo;
  submit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
  nextChargeDate: string;
  onBack: () => void;
}) {
  const { info, setField, submit, submitting, error, nextChargeDate, onBack } = props;
  return (
    <div className="relative min-h-screen bg-ink-950 text-white">
      <div className="hero-gradient absolute inset-0 -z-10" />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Atgal
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src="/lumo-logo.png" alt="Lumo" className="h-7 w-auto" />
          </Link>
          <span className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <StepHeader current={1} total={2} />
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-lime-300">
            <Sparkles className="h-3.5 w-3.5" /> Klubo prenumerata
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Sukurkite savo klubo paskyrą.
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Pirmos 2 savaitės — nemokamai. Pirmasis mokėjimas{" "}
            <strong className="text-white">{formatPrice(MONTHLY_FEE)}</strong> bus{" "}
            <strong className="text-white">{nextChargeDate}</strong>, ir kartosis
            kas mėnesį, kol atšauksite prenumeratą.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <FormSection
            step={1}
            title="Klubo informacija"
            description="Šis vardas matysis jūsų nariams ir treneriams."
          >
            <Field
              label="Klubo pavadinimas"
              required
              value={info.clubName}
              onChange={(v) => setField("clubName", v)}
              placeholder="pvz. SportApp Vilnius"
            />
          </FormSection>

          <FormSection
            step={2}
            title="Jūsų administratoriaus paskyra"
            description="Šiais duomenimis prisijungsite prie savo klubo administravimo."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Vardas ir pavardė"
                required
                value={info.adminName}
                onChange={(v) => setField("adminName", v)}
                placeholder="Vardenis Pavardenis"
              />
              <Field
                label="El. paštas"
                required
                type="email"
                value={info.adminEmail}
                onChange={(v) => setField("adminEmail", v)}
                placeholder="jus@klubas.lt"
              />
              <Field
                label="Slaptažodis"
                required
                type="password"
                value={info.adminPassword}
                onChange={(v) => setField("adminPassword", v)}
                placeholder="Bent 6 simboliai"
                hint="Jį naudosite prisijungimui."
                className="sm:col-span-2"
              />
            </div>
          </FormSection>

          <div className="rounded-2xl border border-lime-400/30 bg-lime-400/10 p-5 text-sm">
            <p className="font-display text-base font-bold text-lime-200">
              2 savaitės nemokamai, po to {formatPrice(MONTHLY_FEE)} per mėnesį.
            </p>
            <p className="mt-1.5 text-white/70">
              Kitame žingsnyje pridėsite mokėjimo kortelę — šiandien nieko
              neapmokestiname. Pirmasis mokėjimas{" "}
              <strong className="text-white">{formatPrice(MONTHLY_FEE)}</strong>{" "}
              bus <strong className="text-white">{nextChargeDate}</strong>, ir
              kartosis kas mėnesį, kol atšauksite.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-accent h-12 w-full text-base"
          >
            {submitting ? "Ruošiamasi…" : "Tęsti į mokėjimą"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </main>
    </div>
  );
}

function PaymentStep(props: {
  clientSecret: string;
  nextChargeDate: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const { clientSecret, nextChargeDate, onSuccess, onBack } = props;
  const promise = getStripePromise();

  if (!promise) {
    return (
      <PaymentShell onBack={onBack}>
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Trūksta „VITE_STRIPE_PUBLISHABLE_KEY" aplinkos kintamojo. Praneškite administratoriui.
        </div>
      </PaymentShell>
    );
  }

  return (
    <PaymentShell onBack={onBack}>
      <Elements
        stripe={promise}
        options={{
          clientSecret,
          appearance: {
            theme: "night",
            variables: {
              colorPrimary: "#9ae819",
              colorBackground: "rgba(255,255,255,0.06)",
              colorText: "#ffffff",
              colorTextSecondary: "rgba(255,255,255,0.6)",
              colorTextPlaceholder: "rgba(255,255,255,0.3)",
              colorDanger: "#f87171",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              spacingUnit: "4px",
              borderRadius: "12px",
            },
            rules: {
              ".Input": {
                border: "1px solid rgba(255,255,255,0.1)",
              },
              ".Input:focus": {
                border: "1px solid #9ae819",
                boxShadow: "0 0 0 3px rgba(154,232,25,0.2)",
              },
              ".Label": {
                color: "rgba(255,255,255,0.8)",
                fontWeight: "600",
              },
            },
          },
        }}
      >
        <PaymentForm onSuccess={onSuccess} nextChargeDate={nextChargeDate} />
      </Elements>
    </PaymentShell>
  );
}

function PaymentShell({
  onBack,
  children,
}: {
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-ink-950 text-white">
      <div className="hero-gradient absolute inset-0 -z-10" />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Atgal
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src="/lumo-logo.png" alt="Lumo" className="h-7 w-auto" />
          </Link>
          <span className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <StepHeader current={2} total={2} />
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-lime-300">
            <Lock className="h-3.5 w-3.5" /> Saugus mokėjimas
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Pridėkite mokėjimo kortelę.
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Pirmos <strong className="text-white">2 savaitės — nemokamai</strong>.
            Po to kortelė bus apmokestinta{" "}
            <strong className="text-white">{formatPrice(MONTHLY_FEE)}</strong>{" "}
            kas mėnesį, kol atšauksite prenumeratą. Šiandien nieko
            neapmokestiname.
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}

function PaymentForm({
  onSuccess,
  nextChargeDate,
}: {
  onSuccess: () => void;
  nextChargeDate: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Stripe may redirect the user (3DS challenge, wallets) and return to
  // /plans?setup_intent=...&redirect_status=succeeded. If we detect that,
  // treat it as success. redirect: 'if_required' avoids the redirect for
  // simple cards.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("redirect_status") === "succeeded") {
      onSuccess();
    }
  }, [onSuccess]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setSubmitting(true);

    const { error: err, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/plans",
      },
      redirect: "if_required",
    });

    if (err) {
      setError(err.message ?? "Nepavyko išsaugoti kortelės.");
      setSubmitting(false);
      return;
    }

    if (setupIntent && setupIntent.status === "succeeded") {
      onSuccess();
      return;
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-lime-300">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Mokėjimo kortelė
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Kortelės duomenys apdorojami Stripe — mūsų serveryje nesaugomi.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <PaymentElement />
        </div>
      </section>

      <div className="rounded-2xl border border-lime-400/30 bg-lime-400/10 p-5 text-sm">
        <p className="font-display text-base font-bold text-lime-200">
          2 savaitės nemokamai. Šiandien nieko neapmokestiname.
        </p>
        <p className="mt-1.5 text-white/70">
          Paspausdami „Aktyvuoti bandymo laikotarpį" sutinkate, kad po nemokamo
          laikotarpio ({" "}
          <strong className="text-white">{nextChargeDate}</strong>) jūsų kortelė
          bus apmokestinta{" "}
          <strong className="text-white">{formatPrice(MONTHLY_FEE)}</strong> per
          mėnesį. Prenumerata kartojasi kas mėnesį, kol atšauksite ją iš klubo
          administravimo skydelio.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="btn-accent h-12 w-full text-base"
      >
        {submitting
          ? "Tvirtinama…"
          : "Aktyvuoti bandymo laikotarpį"}
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </button>

      <p className="pb-6 text-center text-xs text-white/50">
        Užšifruotas ryšys. Kortelės duomenys apsaugoti Stripe.
      </p>
    </form>
  );
}

function StepHeader({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const active = i + 1 <= current;
        return (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              active ? "bg-lime-400" : "bg-white/10"
            }`}
          />
        );
      })}
      <span className="ml-2 text-xs font-semibold text-white/50">
        {current}/{total}
      </span>
    </div>
  );
}

function FormSection({
  step,
  title,
  description,
  icon: Icon,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-sm font-bold text-lime-300">
          {step}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-white/60" />}
            <h2 className="font-display text-lg font-bold text-white">{title}</h2>
          </div>
          {description && (
            <p className="mt-1 text-sm text-white/60">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  type,
  inputMode,
  hint,
  className,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-white/80">
        {label}
        {required && <span className="text-lime-300"> *</span>}
      </label>
      <input
        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20"
        required={required}
        type={type ?? "text"}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <p className="mt-1.5 text-xs text-white/50">{hint}</p>}
    </div>
  );
}

function SuccessScreen({
  result,
  password,
}: {
  result: SignupResult;
  password: string;
}) {
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const copy = async (which: "email" | "password", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative min-h-screen bg-ink-950 text-white">
      <div className="hero-gradient absolute inset-0 -z-10" />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-2xl items-center justify-center px-6 py-4">
          <img src="/lumo-logo.png" alt="Lumo" className="h-7 w-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div
              className="absolute -inset-3 rounded-full bg-lime-400/20 blur-2xl"
              aria-hidden
            />
            <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-lime-400 text-ink-950 shadow-glow">
              <Check className="h-8 w-8" strokeWidth={3} />
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-lime-300">
            Sveikiname
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Klubas „{result.club.name}" sukurtas.
          </h1>
          <p className="mt-3 text-sm text-white/70">
            Prenumerata aktyvuota. Kitas mokėjimas —{" "}
            <strong className="text-white">
              {formatDate(result.subscription.trialEndsAt)}
            </strong>
            . Kas mėnesį automatiškai nurašysime{" "}
            <strong className="text-white">
              {formatPrice(result.subscription.monthlyFee)}
            </strong>
            .
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
          <h2 className="font-display text-base font-bold text-white">
            Jūsų prisijungimo duomenys
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Išsaugokite šiuos duomenis — jais prisijungsite prie savo klubo administravimo.
          </p>

          <div className="mt-4 space-y-3">
            <CredentialRow
              label="El. paštas"
              value={result.admin.email}
              copied={copied === "email"}
              onCopy={() => copy("email", result.admin.email)}
            />
            <CredentialRow
              label="Slaptažodis"
              value={password}
              copied={copied === "password"}
              onCopy={() => copy("password", password)}
            />
          </div>

          <Link
            to={result.loginUrl}
            className="btn-accent mt-6 h-12 w-full text-base"
          >
            Prisijungti prie klubo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">
          <p className="font-display text-base font-bold text-white">Kas toliau?</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
              <span>Pridėkite trenerius ir narius į savo klubą.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
              <span>Suplanuokite pirmąsias treniruotes.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
              <span>Nustatykite narystės mokesčius.</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-widest text-white/50">
          {label}
        </div>
        <div className="mt-0.5 truncate font-mono text-sm text-white">{value}</div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? "Nukopijuota" : "Kopijuoti"}
      </button>
    </div>
  );
}
