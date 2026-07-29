import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Copy,
  CreditCard,
  Infinity as InfinityIcon,
  Lock,
  Sparkles,
  Ticket,
  User,
} from "lucide-react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  fetchPublicClub,
  joinClubApi,
  type JoinResult,
  type PublicClub,
} from "../api/public";
import { ApiError } from "../api/client";
import type { MembershipPlan } from "../types";

import { getConnectedStripe } from "../utils/stripe";

type Step = "form" | "payment" | "success";

type FormState = {
  name: string;
  email: string;
  password: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "unspecified";
  membershipPlanId: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  password: "",
  phone: "",
  dateOfBirth: "",
  gender: "unspecified",
  membershipPlanId: "",
};

function formatMoney(v: number, currency: string): string {
  try {
    return v.toLocaleString("lt-LT", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

export default function MemberJoin() {
  const { slug = "" } = useParams();
  const [club, setClub] = useState<PublicClub | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [result, setResult] = useState<JoinResult | null>(null);
  const [savedPassword, setSavedPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchPublicClub(slug)
      .then((c) => {
        if (cancelled) return;
        setClub(c);
        if (c.plans[0]) {
          setForm((prev) => ({ ...prev, membershipPlanId: c.plans[0].id }));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError ? err.message : "Nepavyko įkelti klubo.",
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const chosenPlan = useMemo(
    () => club?.plans.find((p) => p.id === form.membershipPlanId) ?? null,
    [club, form.membershipPlanId],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await joinClubApi(slug, {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender,
        membershipPlanId: form.membershipPlanId || undefined,
      });
      setSavedPassword(form.password);
      setResult(res);
      // If Stripe returned a client secret, take the member to a real payment
      // step. Otherwise the club isn't Connect-ready (or the plan is free) —
      // skip straight to success.
      if (res.paymentRequired && res.clientSecret) {
        setStep("payment");
      } else {
        setStep("success");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Nepavyko baigti registracijos. Bandykite dar kartą.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-lime-400" />
          <p className="text-sm text-white/70">Kraunama…</p>
        </div>
      </div>
    );
  }

  if (loadError || !club) {
    return (
      <div className="min-h-screen bg-ink-950 text-white">
        <div className="hero-gradient absolute inset-0 -z-10" />
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Klubas nerastas</h1>
          <p className="mt-2 text-sm text-white/70">
            {loadError ?? "Patikrinkite nuorodą ir bandykite dar kartą."}
          </p>
          <Link to="/" className="btn-accent mt-6 h-11 px-6">
            Į pradžią
          </Link>
        </div>
      </div>
    );
  }

  if (step === "success" && result) {
    return (
      <SuccessScreen
        clubName={club.name}
        clubLogo={club.logoUrl}
        memberName={result.member.name}
        email={result.member.email}
        password={savedPassword}
        paymentWasCollected={result.paymentRequired && !!result.clientSecret}
      />
    );
  }

  if (step === "payment" && result?.clientSecret && result.club.stripeConnectAccountId) {
    return (
      <PaymentStep
        clubName={club.name}
        clubLogo={club.logoUrl}
        clientSecret={result.clientSecret}
        stripeAccount={result.club.stripeConnectAccountId}
        plan={chosenPlan}
        onSuccess={() => setStep("success")}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-ink-950 text-white">
      <div className="hero-gradient absolute inset-0 -z-10" />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Į pradžią
          </Link>
          <div className="flex items-center gap-2">
            {club.logoUrl ? (
              <img
                src={club.logoUrl}
                alt={`${club.name} logotipas`}
                className="h-8 max-w-[120px] object-contain"
              />
            ) : (
              <img
                src="/lumo-logo.png"
                alt="Lumo"
                className="h-7 w-auto"
              />
            )}
          </div>
          <span className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-lime-300">
            <Sparkles className="h-3.5 w-3.5" /> Nario registracija
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Prisijunkite prie klubo „{club.name}".
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Užpildykite formą, pasirinkite narystės planą ir kitame žingsnyje apmokėkite pirmą mėnesį.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <FormSection
            step={1}
            title="Jūsų duomenys"
            description="Šie duomenys bus matomi treneriams ir klubo administratoriui."
            icon={User}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Vardas ir pavardė"
                required
                value={form.name}
                onChange={(v) => setField("name", v)}
                placeholder="Vardenis Pavardenis"
              />
              <Field
                label="El. paštas"
                required
                type="email"
                value={form.email}
                onChange={(v) => setField("email", v)}
                placeholder="jus@pavyzdys.lt"
              />
              <Field
                label="Slaptažodis"
                required
                type="password"
                value={form.password}
                onChange={(v) => setField("password", v)}
                placeholder="Bent 6 simboliai"
                hint="Jį naudosite prisijungimui."
              />
              <Field
                label="Telefonas"
                type="tel"
                value={form.phone}
                onChange={(v) => setField("phone", v)}
                placeholder="+370…"
              />
              <Field
                label="Gimimo data"
                type="date"
                value={form.dateOfBirth}
                onChange={(v) => setField("dateOfBirth", v)}
              />
              <SelectField
                label="Lytis"
                value={form.gender}
                onChange={(v) => setField("gender", v as FormState["gender"])}
              >
                <option value="unspecified">Nenurodyta</option>
                <option value="male">Vyras</option>
                <option value="female">Moteris</option>
              </SelectField>
            </div>
          </FormSection>

          <FormSection
            step={2}
            title="Pasirinkite planą"
            description="Planas nusako mėnesinį mokestį ir savaitės treniruočių limitą."
          >
            {club.plans.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
                Klubas dar nepasiūlė narystės planų. Susisiekite su klubo administratoriumi.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {club.plans.map((p) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    selected={form.membershipPlanId === p.id}
                    onSelect={() => setField("membershipPlanId", p.id)}
                  />
                ))}
              </div>
            )}
          </FormSection>

          <div className="rounded-2xl border border-lime-400/30 bg-lime-400/10 p-5 text-sm">
            <p className="font-display text-base font-bold text-lime-200">
              {chosenPlan
                ? chosenPlan.planType === "credits"
                  ? `Pasirinktas paketas: ${chosenPlan.name} — ${formatMoney(chosenPlan.monthlyFee, chosenPlan.currency)} už ${chosenPlan.creditCount ?? 0} treniruotes`
                  : `Pasirinktas planas: ${chosenPlan.name} — ${formatMoney(chosenPlan.monthlyFee, chosenPlan.currency)} / mėn.`
                : "Pasirinkite narystės planą aukščiau."}
            </p>
            <p className="mt-1.5 text-white/70">
              {chosenPlan?.planType === "credits"
                ? "Kitame žingsnyje apmokėsite paketą vieną kartą. Kai treniruotės pasibaigs, galėsite įsigyti naują paketą iš savo profilio."
                : "Kitame žingsnyje pridėsite mokėjimo kortelę. Kortelė bus automatiškai apmokestinama kas mėnesį, kol atšauksite prenumeratą."}
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

          <p className="pb-6 text-center text-xs text-white/50">
            <Lock className="mr-1 inline h-3 w-3" />
            Užšifruotas ryšys.
          </p>
        </form>
      </main>
    </div>
  );
}

function PaymentStep(props: {
  clubName: string;
  clubLogo: string | null;
  clientSecret: string;
  stripeAccount: string;
  plan: MembershipPlan | null;
  onSuccess: () => void;
}) {
  const { clubName, clubLogo, clientSecret, stripeAccount, plan, onSuccess } = props;
  const promise = getConnectedStripe(stripeAccount);

  return (
    <div className="relative min-h-screen bg-ink-950 text-white">
      <div className="hero-gradient absolute inset-0 -z-10" />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            {clubLogo ? (
              <img src={clubLogo} alt={`${clubName} logotipas`} className="h-8 max-w-[120px] object-contain" />
            ) : (
              <img src="/lumo-logo.png" alt="Lumo" className="h-7 w-auto" />
            )}
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-lime-300">
            2/2 · Mokėjimas
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-lime-300">
            <Lock className="h-3.5 w-3.5" /> Saugus mokėjimas
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Pridėkite mokėjimo kortelę.
          </h1>
          {plan && (
            <p className="mt-2 text-sm text-white/70">
              {plan.name} —{" "}
              <strong className="text-white">
                {formatMoney(plan.monthlyFee, plan.currency)}
              </strong>{" "}
              {plan.planType === "credits"
                ? `už ${plan.creditCount ?? 0} treniruotes. Vienkartinis mokėjimas — jokio automatinio pratęsimo.`
                : "/ mėn. Mokestis kartojasi kas mėnesį, kol atšauksite prenumeratą."}
            </p>
          )}
        </div>

        {!promise ? (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Trūksta „VITE_STRIPE_PUBLISHABLE_KEY" aplinkos kintamojo. Praneškite klubo administratoriui.
          </div>
        ) : (
          <Elements
            stripe={promise}
            options={{
              // The `stripeAccount` connection was set at loadStripe() level
              // above, so all Elements calls route to the connected account.
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
            <PaymentForm onSuccess={onSuccess} plan={plan} />
          </Elements>
        )}
      </main>
    </div>
  );
}

function PaymentForm({
  onSuccess,
  plan,
}: {
  onSuccess: () => void;
  plan: MembershipPlan | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (err) {
      setError(err.message ?? "Nepavyko apmokėti kortelės.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
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
          : plan
            ? `Apmokėti ${formatMoney(plan.monthlyFee, plan.currency)}`
            : "Apmokėti"}
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </button>

      <p className="pb-6 text-center text-xs text-white/50">
        Užšifruotas ryšys. Kortelės duomenys apsaugoti Stripe.
      </p>
    </form>
  );
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: MembershipPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-2xl border p-4 transition-colors ${
        selected
          ? "border-lime-400 bg-lime-400/10"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-bold text-white">{plan.name}</p>
          <p className="mt-0.5 text-xs text-white/60">
            {formatMoney(plan.monthlyFee, plan.currency)}
            {plan.planType === "credits" ? " · vienkartinis" : " / mėn."}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-white/70">
            {plan.planType === "credits" ? (
              <>
                <Ticket className="h-3 w-3 text-lime-300" />
                {plan.creditCount ?? 0} treniruotės pakete
              </>
            ) : plan.trainingsPerWeek === null ? (
              <>
                <InfinityIcon className="h-3 w-3 text-lime-300" />
                Neribotai treniruočių / sav.
              </>
            ) : (
              <>{plan.trainingsPerWeek} treniruotės / sav.</>
            )}
          </p>
        </div>
        <div
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
            selected ? "border-lime-400 bg-lime-400" : "border-white/30"
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5 text-ink-950" strokeWidth={3} />}
        </div>
      </div>
    </button>
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
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  hint?: string;
}) {
  return (
    <div>
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

function SelectField({
  label,
  required,
  value,
  onChange,
  children,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-white/80">
        {label}
        {required && <span className="text-lime-300"> *</span>}
      </label>
      <select
        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 text-sm text-white outline-none transition-colors focus:border-lime-400 focus:ring-2 focus:ring-lime-400/20"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

function SuccessScreen({
  clubName,
  clubLogo,
  memberName,
  email,
  password,
  paymentWasCollected,
}: {
  clubName: string;
  clubLogo: string | null;
  memberName: string;
  email: string;
  password: string;
  paymentWasCollected: boolean;
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
          {clubLogo ? (
            <img src={clubLogo} alt={`${clubName} logotipas`} className="h-8 max-w-[160px] object-contain" />
          ) : (
            <img src="/lumo-logo.png" alt="Lumo" className="h-7 w-auto" />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-lime-400/20 blur-2xl" aria-hidden />
            <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-lime-400 text-ink-950 shadow-glow">
              <Check className="h-8 w-8" strokeWidth={3} />
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-lime-300">
            Sveiki atvykę
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            {memberName}, esate klubo „{clubName}" narys.
          </h1>
          <p className="mt-3 text-sm text-white/70">
            {paymentWasCollected
              ? "Mokėjimas patvirtintas. Prisijunkite naudodami toliau nurodytus duomenis."
              : "Klubo administratorius su Jumis susisieks dėl mokėjimo. Kol kas galite prisijungti su šiais duomenimis."}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
          <h2 className="font-display text-base font-bold text-white">
            Jūsų prisijungimo duomenys
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Išsaugokite šiuos duomenis — jais prisijungsite prie klubo.
          </p>

          <div className="mt-4 space-y-3">
            <CredentialRow
              label="El. paštas"
              value={email}
              copied={copied === "email"}
              onCopy={() => copy("email", email)}
            />
            <CredentialRow
              label="Slaptažodis"
              value={password}
              copied={copied === "password"}
              onCopy={() => copy("password", password)}
            />
          </div>

          <Link to="/login" className="btn-accent mt-6 h-12 w-full text-base">
            Prisijungti prie klubo
            <ArrowRight className="h-4 w-4" />
          </Link>
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
