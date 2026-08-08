import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CreditCard,
  Sparkles,
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

const MONTHLY_FEE = 100;

const INCLUDED: string[] = [
  "Neribotai narių, trenerių ir treniruočių",
  "AI generuojami treniruočių planai",
  "Individualūs planai kiekvienam nariui",
  "Automatinis narystės mokesčių surinkimas per Stripe",
  "Stripe piniginė — bet kada išsigryninkite pinigus",
  "Lyderių lentelės ir rezultatų sekimas",
  "Techninė pagalba lietuviškai",
  "Bet kada galima atsisakyti prenumeratos",
];

type RoleTab = "admin" | "coach" | "member";

const ROLES: {
  id: RoleTab;
  label: string;
  eyebrow: string;
  bullets: string[];
  screens: { src: string; alt: string; phone?: boolean }[];
}[] = [
  {
    id: "admin",
    label: "Administratorius",
    eyebrow: "Visas klubas vienoje vietoje",
    bullets: [
      "Pajamos, registracijos ir nariai — realiu laiku viename skydelyje.",
      "Nustatykite narystės planus, surinkite mokėjimus automatiškai per Stripe.",
      "Valdykite trenerius, treniruočių tvarkaraštį ir narius be Excel.",
    ],
    screens: [
      {
        src: "/screenshots/admin-dashboard.png",
        alt: "Administratoriaus skydelis",
      },
      { src: "/screenshots/admin-payments.png", alt: "Mokėjimų valdymas" },
    ],
  },
  {
    id: "coach",
    label: "Treneris",
    eyebrow: "Planuok, vesk, stebėk",
    bullets: [
      "Sugeneruokite treniruotės planą su AI per 10 sekundžių.",
      "Kalendorius, registracijų sąrašas ir narių planai — viskas tiesiai telefone.",
      "Priskirk kiekvienam nariui individualų planą treniruotei.",
    ],
    screens: [
      { src: "/screenshots/admin-ai-plan.png", alt: "AI treniruočių planai" },
      { src: "/screenshots/coach-calendar.png", alt: "Trenerio kalendorius" },
    ],
  },
  {
    id: "member",
    label: "Narys",
    eyebrow: "Narių programa telefone",
    bullets: [
      "Nariai registruojasi į treniruotes, mato tvarkaraštį ir savo planą.",
      "Treniruočių istorija, lyderių lentelės ir asmeniniai rekordai.",
      "Narystė ir mokėjimai — viskas vienoje programėlėje.",
    ],
    screens: [
      {
        src: "/screenshots/member-trainings.jpg",
        alt: "Treniruočių tvarkaraštis",
        phone: true,
      },
      {
        src: "/screenshots/member-results.jpg",
        alt: "Rezultatų lentelės",
        phone: true,
      },
    ],
  },
];

const FEATURES_SHOWCASE: {
  tag: string;
  title: string;
  description: string;
  bullets: string[];
  images: { src: string; alt: string }[];
}[] = [
  {
    tag: "Nariai",
    title: "Visi nariai — vienoje vietoje.",
    description:
      "Stebėkite kiekvieno nario narystę, mokėjimo statusą ir treniruočių aktyvumą.",
    bullets: [
      "Matote visų narių narystės statusą ir mokėjimus realiu laiku.",
      "Gaukite nuorodą naujiems nariams — jie registruojasi tiesiai į jūsų klubą patys.",
      "Filtruokite pagal vėluojančius mokėjimus ir greitai imkitės veiksmų.",
    ],
    images: [{ src: "/screenshots/admin-members.png", alt: "Narių sąrašas" }],
  },
  {
    tag: "Treniruočių planai",
    title: "Sukurkite planą vieną kartą — naudokite visada.",
    description:
      "Rašykite planus patys arba sugeneruokite su AI. Išsaugokite kaip šabloną ir naudokite kiekvienoje treniruotėje.",
    bullets: [
      "AI sugeneruoja pilną treniruotės planą pagal jūsų aprašymą per kelias sekundes.",
      "Išsaugoti planai tampa šablonais — pasirinkite ir priskirkite naujoms treniruotėms.",
      "Kiekvienas narys mato savo individualų planą telefone treniruotės metu.",
    ],
    images: [
      {
        src: "/screenshots/admin-ai-plan.png",
        alt: "AI treniruočių planų kūrimas",
      },
    ],
  },
  {
    tag: "Finansai",
    title: "Pilna mokėjimų kontrolė.",
    description:
      "Matote visas klubo pajamas, kiekvieno nario mokėjimo istoriją ir prognozuojamas pajamas iš turimų prenumeratų.",
    bullets: [
      "Realaus laiko pajamų suvestinė — kiek surinkta, kiek laukiama.",
      "Kiekvieno nario mokėjimų istorija ir sąskaitos vienoje vietoje.",
      "Automatiniai priminimai nariams, kurie vėluoja su mokėjimu.",
    ],
    images: [
      { src: "/screenshots/admin-payments.png", alt: "Mokėjimų valdymas" },
    ],
  },
  {
    tag: "Stripe piniginė",
    title: "Pinigai tiesiai į jūsų sąskaitą.",
    description:
      "Jūsų klubas gauna savo Stripe piniginę. Nariai moka — pinigai patenka pas jus. Išsigryninkite į banką bet kada.",
    bullets: [
      "Jūsų klubo Stripe piniginė — pinigai nepatenka per Lumo.",
      "Išsigryninkite pajamas į banko sąskaitą bet kuriuo metu.",
      "Pilna transakcijų istorija ir ataskaitos tiesiai iš Stripe.",
    ],
    images: [
      { src: "/screenshots/stripe-wallet.png", alt: "Stripe pajamų suvestinė" },
    ],
  },
  {
    tag: "Narystės planai",
    title: "Jūs nusprendžiate, kiek kainuoja narystė.",
    description:
      "Kurkite mėnesinius planus su automatiniu nurašymu arba vienkartinių treniruočių paketus — pasirinkite, kas tinka jūsų klubui.",
    bullets: [
      "Mėnesiniai planai su automatiniu Stripe atsiskaitymu kas mėnesį.",
      "Vienkartiniai paketai — nariai perka N treniruočių iš anksto.",
      "Keli planai vienu metu — skirtingos kainos skirtingoms grupėms.",
    ],
    images: [
      {
        src: "/screenshots/admin-membership.png",
        alt: "Narystės planų kūrimas",
      },
    ],
  },
  {
    tag: "Treneriai",
    title: "Pridėkite trenerius ir stebėkite jų darbą.",
    description:
      "Kiekvienas treneris gauna savo paskyrą su savo tvarkaraščiu, treniruotėmis ir nariams skirtais planais.",
    bullets: [
      "Treneris prisijungia su savo paskyra ir mato tik savo treniruotes.",
      "Kiekvienas treneris turi savo darbo kalendorių su visomis treniruotėmis.",
      "Treneris sukuria ir priskiria planus, tvarko registracijas ir lankomumą.",
    ],
    images: [
      {
        src: "/screenshots/admin-add-coach.png",
        alt: "Trenerio paskyros kūrimas",
      },
      {
        src: "/screenshots/coach-calendar.png",
        alt: "Trenerio darbo kalendorius",
      },
    ],
  },
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

  // Rough "next charge" preview shown on the signup steps — 30 days out to
  // match the trial. The authoritative next-charge date comes from the server.
  const nextChargeDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
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

  return <LandingPage onStart={startSignup} />;
}

function LandingPage({ onStart }: { onStart: () => void }) {
  const [activeTab, setActiveTab] = useState<RoleTab>("admin");
  const role = ROLES.find((r) => r.id === activeTab)!;

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="hero-gradient absolute inset-0 -z-10" />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <Link to="/" className="flex items-center gap-2">
          <img src="/lumo-logo.png" alt="Lumo" className="h-8 w-auto" />
        </Link>
        <Link
          to="/login"
          className="text-sm font-semibold text-white/60 hover:text-white"
        >
          Prisijungti
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        {/* Hero */}
        <section className="py-14 text-center lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-lime-300">
            <Sparkles className="h-3.5 w-3.5" /> Sporto klubų platforma
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Valdykite klubą.
            <br className="hidden sm:block" /> Stebėkite rezultatus.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
            Tvarkaraštis, mokėjimai, AI planai ir narių programa — visa tai
            vienoje sistemoje.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onStart}
              className="btn-accent h-12 px-8 text-base"
            >
              Išbandyti nemokamai 30 dienų <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#kaina"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 px-6 text-sm font-semibold text-white hover:bg-white/5"
            >
              Žiūrėti kainą
            </a>
          </div>
          <p className="mt-3 text-xs text-white/40">
            Pirmas mėnuo nemokamai · Jokių slaptų mokesčių · Bet kada galima
            atšaukti
          </p>
        </section>

        {/* Hero screenshot */}
        <div className="relative mb-16 -mx-4 sm:mx-0">
          <div
            className="absolute -inset-6 rounded-3xl bg-lime-400/10 blur-3xl"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <img
              src="/screenshots/admin-dashboard.png"
              alt="Lumo administratoriaus skydelis"
              className="w-full object-cover"
              loading="eager"
            />
          </div>
        </div>

        {/* Role showcase */}
        <section className="py-8">
          <div className="mb-6 text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Kiekvienam – savo erdvė.
            </h2>
            <p className="mt-2 text-white/60">
              Administratorius, treneris ir narys — visi gauna tai, ko jiems
              reikia.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="mb-8 flex justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 sm:inline-flex sm:w-auto">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveTab(r.id)}
                className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors sm:flex-none ${
                  activeTab === r.id
                    ? "bg-lime-400 text-ink-950"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Role content */}
          <div className="grid items-start gap-8 lg:grid-cols-2">
            {/* Screenshots */}
            <div
              className={`flex gap-3 ${role.screens[0].phone ? "justify-center" : ""}`}
            >
              {role.screens.map((s) => (
                <div
                  key={s.src}
                  className={`overflow-hidden rounded-2xl border border-white/10 shadow-xl ${
                    s.phone ? "w-44 flex-none sm:w-52" : "flex-1"
                  }`}
                >
                  <img
                    src={s.src}
                    alt={s.alt}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* Text */}
            <div className="flex flex-col justify-center lg:py-8">
              <p className="text-xs font-bold uppercase tracking-widest text-lime-400">
                {role.eyebrow}
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold">
                {role.label}
              </h3>
              <ul className="mt-5 space-y-4">
                {role.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-lime-400" />
                    <span className="text-white/80">{b}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={onStart}
                className="mt-8 inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/15"
              >
                Pradėti nemokamai <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Feature showcase */}
        <section className="py-8 space-y-24">
          {FEATURES_SHOWCASE.map((f, i) => (
            <div
              key={f.tag}
              className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-last" : ""}`}
            >
              {/* Screenshots */}
              <div
                className={`flex gap-3 ${f.images.length > 1 ? "items-start" : ""}`}
              >
                {f.images.map((img, j) => (
                  <div
                    key={img.src}
                    className={`overflow-hidden rounded-2xl border border-white/10 shadow-2xl ${f.images.length > 1 ? (j === 0 ? "w-[45%] mt-8" : "w-[55%]") : "w-full"}`}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>

              {/* Text */}
              <div className="lg:px-4">
                <span className="inline-block rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-lime-400">
                  {f.tag}
                </span>
                <h3 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
                  {f.title}
                </h3>
                <p className="mt-3 text-white/60">{f.description}</p>
                <ul className="mt-5 space-y-3">
                  {f.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-3 text-sm text-white/80"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </section>

        {/* CTA between features and pricing */}
        <div className="py-10 text-center">
          <button onClick={onStart} className="btn-accent h-13 px-8 text-base">
            Pradėti nemokamai — pirmas mėnuo dovanų{" "}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Pricing */}
        <section id="kaina" className="py-16">
          <div className="mx-auto max-w-2xl rounded-3xl border border-lime-400/30 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 sm:p-10">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-lime-300">
                Klubo prenumerata
              </span>
              <div className="mt-5 flex items-end justify-center gap-2">
                <span className="font-display text-6xl font-bold">
                  {formatPrice(MONTHLY_FEE)}
                </span>
                <span className="mb-2 text-lg text-white/50">/ mėn.</span>
              </div>
              <p className="mt-2 text-sm text-white/60">
                Pirmas mėnuo nemokamai. Viena kaina — visas klubas.
              </p>
            </div>

            <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">
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
                onClick={onStart}
                className="btn-accent h-12 w-full max-w-sm px-6 text-base"
              >
                Išbandyti nemokamai 30 dienų <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-white/40">
                Šiandien nieko neapmokestiname · Bet kada galima atšaukti
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-8">
          <h2 className="mb-6 font-display text-xl font-bold sm:text-2xl">
            Dažni klausimai
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Faq
              q="Kada bus nurašytas pirmas mokėjimas?"
              a={`Pirmas mėnuo nemokamai — kortelė apmokestinama tik po 30 dienų (${formatPrice(MONTHLY_FEE)}).`}
            />
            <Faq
              q="Kaip veikia narių mokėjimai?"
              a="Nariai moka per Stripe. Pinigai patenka tiesiai į jūsų klubo piniginę — bet kada išsigryninkite."
            />
            <Faq
              q="Kaip veikia AI treniruočių planai?"
              a="Nurodote tikslą ir lygį — AI sugeneruoja planą su pratimais, apkrova ir progresija per kelias sekundes."
            />
            <Faq
              q="Kiek narių galiu turėti?"
              a={`Neribotai — ${formatPrice(MONTHLY_FEE)} už visą klubą, nesvarbu, ar turite 20 ar 500 narių.`}
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
  const { info, setField, submit, submitting, error, nextChargeDate, onBack } =
    props;
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
            Pirmas mėnuo — nemokamai. Pirmasis mokėjimas{" "}
            <strong className="text-white">{formatPrice(MONTHLY_FEE)}</strong>{" "}
            bus <strong className="text-white">{nextChargeDate}</strong>, ir
            kartosis kas mėnesį, kol atšauksite prenumeratą.
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
              Pirmas mėnuo nemokamai, po to {formatPrice(MONTHLY_FEE)} per
              mėnesį.
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
          Trūksta „VITE_STRIPE_PUBLISHABLE_KEY" aplinkos kintamojo. Praneškite
          administratoriui.
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
            Pirmas <strong className="text-white">mėnuo — nemokamai</strong>. Po
            to kortelė bus apmokestinta{" "}
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
          <PaymentElement
            options={{
              wallets: { link: "never", applePay: "never", googlePay: "never" },
            }}
          />
        </div>
      </section>

      <div className="rounded-2xl border border-lime-400/30 bg-lime-400/10 p-5 text-sm">
        <p className="font-display text-base font-bold text-lime-200">
          Pirmas mėnuo nemokamai. Šiandien nieko neapmokestiname.
        </p>
        <p className="mt-1.5 text-white/70">
          Paspausdami „Aktyvuoti bandymo laikotarpį" sutinkate, kad po nemokamo
          laikotarpio ( <strong className="text-white">{nextChargeDate}</strong>
          ) jūsų kortelė bus apmokestinta{" "}
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
        {submitting ? "Tvirtinama…" : "Aktyvuoti bandymo laikotarpį"}
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
            <h2 className="font-display text-lg font-bold text-white">
              {title}
            </h2>
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
            Išsaugokite šiuos duomenis — jais prisijungsite prie savo klubo
            administravimo.
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
          <p className="font-display text-base font-bold text-white">
            Kas toliau?
          </p>
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
        <div className="mt-0.5 truncate font-mono text-sm text-white">
          {value}
        </div>
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
