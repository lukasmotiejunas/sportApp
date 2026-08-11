import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";
import {
  ArrowRight,
  Check,
  CreditCard,
  Sparkles,
  X,
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

type RoleTab = "admin" | "coach" | "member";

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
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
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? "en-US" : "lt-LT";
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
          : t("plans.error_create_club"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const nextChargeDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [locale]);

  if (step === "success" && result) {
    return <SuccessScreen result={result} password={savedPassword} locale={locale} />;
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

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Lumo",
  "alternateName": "Lumo Sport",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "url": "https://lumosport.lt",
  "description": "Sports club management platform with online scheduling, Stripe payment processing, AI-generated training plans, and a member mobile app. First month free.",
  "inLanguage": "lt",
  "offers": {
    "@type": "Offer",
    "price": "100",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "100",
      "priceCurrency": "EUR",
      "unitText": "month"
    }
  },
  "featureList": [
    "Training schedule management",
    "Stripe payment processing",
    "AI training plan generation",
    "Member management and registration",
    "Leaderboards and results tracking",
    "Coach management"
  ],
  "provider": {
    "@type": "Organization",
    "name": "Lumo",
    "url": "https://lumosport.lt"
  }
});

function LandingPage({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<RoleTab>("admin");
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("lumo_popup_seen")) return;
    const timer = setTimeout(() => setPopupOpen(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const closePopup = () => {
    setPopupOpen(false);
    sessionStorage.setItem("lumo_popup_seen", "1");
  };

  const handlePopupCta = () => {
    closePopup();
    onStart();
  };

  const ROLES: {
    id: RoleTab;
    label: string;
    eyebrow: string;
    bullets: string[];
    screens: { src: string; alt: string; phone?: boolean }[];
  }[] = [
    {
      id: "admin",
      label: t("plans.role_admin_label"),
      eyebrow: t("plans.role_admin_eyebrow"),
      bullets: [t("plans.role_admin_b1"), t("plans.role_admin_b2"), t("plans.role_admin_b3")],
      screens: [
        { src: "/screenshots/admin-dashboard.png", alt: "Admin dashboard" },
        { src: "/screenshots/admin-payments.png", alt: "Payment management" },
      ],
    },
    {
      id: "coach",
      label: t("plans.role_coach_label"),
      eyebrow: t("plans.role_coach_eyebrow"),
      bullets: [t("plans.role_coach_b1"), t("plans.role_coach_b2"), t("plans.role_coach_b3")],
      screens: [
        { src: "/screenshots/admin-ai-plan.png", alt: "AI training plans" },
        { src: "/screenshots/coach-calendar.png", alt: "Coach calendar" },
      ],
    },
    {
      id: "member",
      label: t("plans.role_member_label"),
      eyebrow: t("plans.role_member_eyebrow"),
      bullets: [t("plans.role_member_b1"), t("plans.role_member_b2"), t("plans.role_member_b3")],
      screens: [
        { src: "/screenshots/member-trainings.jpg", alt: "Training schedule", phone: true },
        { src: "/screenshots/member-results.jpg", alt: "Results leaderboard", phone: true },
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
      tag: t("plans.feat_members_tag"),
      title: t("plans.feat_members_title"),
      description: t("plans.feat_members_desc"),
      bullets: [t("plans.feat_members_b1"), t("plans.feat_members_b2"), t("plans.feat_members_b3")],
      images: [{ src: "/screenshots/admin-members.png", alt: "Members list" }],
    },
    {
      tag: t("plans.feat_plans_tag"),
      title: t("plans.feat_plans_title"),
      description: t("plans.feat_plans_desc"),
      bullets: [t("plans.feat_plans_b1"), t("plans.feat_plans_b2"), t("plans.feat_plans_b3")],
      images: [{ src: "/screenshots/admin-ai-plan.png", alt: "AI training plan builder" }],
    },
    {
      tag: t("plans.feat_finance_tag"),
      title: t("plans.feat_finance_title"),
      description: t("plans.feat_finance_desc"),
      bullets: [t("plans.feat_finance_b1"), t("plans.feat_finance_b2"), t("plans.feat_finance_b3")],
      images: [{ src: "/screenshots/admin-payments.png", alt: "Payment management" }],
    },
    {
      tag: t("plans.feat_stripe_tag"),
      title: t("plans.feat_stripe_title"),
      description: t("plans.feat_stripe_desc"),
      bullets: [t("plans.feat_stripe_b1"), t("plans.feat_stripe_b2"), t("plans.feat_stripe_b3")],
      images: [{ src: "/screenshots/stripe-wallet.png", alt: "Stripe revenue dashboard" }],
    },
    {
      tag: t("plans.feat_membership_tag"),
      title: t("plans.feat_membership_title"),
      description: t("plans.feat_membership_desc"),
      bullets: [t("plans.feat_membership_b1"), t("plans.feat_membership_b2"), t("plans.feat_membership_b3")],
      images: [{ src: "/screenshots/admin-membership.png", alt: "Membership plan creation" }],
    },
    {
      tag: t("plans.feat_coaches_tag"),
      title: t("plans.feat_coaches_title"),
      description: t("plans.feat_coaches_desc"),
      bullets: [t("plans.feat_coaches_b1"), t("plans.feat_coaches_b2"), t("plans.feat_coaches_b3")],
      images: [
        { src: "/screenshots/admin-add-coach.png", alt: "Add coach account" },
        { src: "/screenshots/coach-calendar.png", alt: "Coach work calendar" },
      ],
    },
  ];

  const INCLUDED = t("plans.included_features", { returnObjects: true }) as string[];

  const role = ROLES.find((r) => r.id === activeTab)!;

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <Helmet>
        <title>Lumo — Sporto klubų valdymo platforma | Sports Club Management</title>
        <meta name="description" content="Lumo — sporto klubų valdymo platforma. Tvarkaraštis, mokėjimai per Stripe, AI treniruočių planai ir narių programa vienoje sistemoje. Pirmas mėnuo nemokamai. Sports club management software." />
        <link rel="canonical" href="https://lumosport.lt/plans" />
        <link rel="alternate" hrefLang="lt" href="https://lumosport.lt/plans" />
        <link rel="alternate" hrefLang="x-default" href="https://lumosport.lt/plans" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Lumo — Sporto klubų valdymo platforma" />
        <meta property="og:description" content="Tvarkaraštis, mokėjimai, AI treniruočių planai ir narių programa — visa tai vienoje sistemoje. Pirmas mėnuo nemokamai." />
        <meta property="og:url" content="https://lumosport.lt/plans" />
        <meta property="og:image" content="https://lumosport.lt/screenshots/admin-dashboard.png" />
        <meta property="og:locale" content="lt_LT" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Lumo — Sporto klubų valdymo platforma" />
        <meta name="twitter:description" content="Tvarkaraštis, mokėjimai, AI treniruočių planai ir narių programa — visa tai vienoje sistemoje." />
        <meta name="twitter:image" content="https://lumosport.lt/screenshots/admin-dashboard.png" />
        <script type="application/ld+json">{JSON_LD}</script>
      </Helmet>
      <div className="hero-gradient absolute inset-0 -z-10" />

      <MarketingPopup open={popupOpen} onClose={closePopup} onCta={handlePopupCta} />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <Link to="/" className="flex items-center gap-2">
          <img src="/lumo-logo.png" alt="Lumo" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            to="/login"
            className="text-sm font-semibold text-white/60 hover:text-white"
          >
            {t("plans.footer_login")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        {/* Hero */}
        <section className="py-14 text-center lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-lime-300">
            <Sparkles className="h-3.5 w-3.5" /> {t("plans.badge")}
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t("plans.hero_title_1")}
            <br className="hidden sm:block" /> {t("plans.hero_title_2")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
            {t("plans.hero_subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onStart}
              className="btn-accent h-12 px-8 text-base"
            >
              {t("plans.try_free")} <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#kaina"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 px-6 text-sm font-semibold text-white hover:bg-white/5"
            >
              {t("plans.see_price")}
            </a>
          </div>
          <p className="mt-3 text-xs text-white/40">
            {t("plans.disclaimer")}
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
              alt="Lumo admin dashboard"
              className="w-full object-cover"
              loading="eager"
            />
          </div>
        </div>

        {/* Role showcase */}
        <section className="py-8">
          <div className="mb-6 text-center">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              {t("plans.roles_title")}
            </h2>
            <p className="mt-2 text-white/60">
              {t("plans.roles_subtitle")}
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
                {t("plans.start_free")} <ArrowRight className="h-4 w-4" />
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
            {t("plans.cta")}{" "}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Pricing */}
        <section id="kaina" className="py-16">
          <div className="mx-auto max-w-2xl rounded-3xl border border-lime-400/30 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 sm:p-10">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-lime-300">
                {t("plans.pricing_badge")}
              </span>
              <div className="mt-5 flex items-end justify-center gap-2">
                <span className="font-display text-6xl font-bold">
                  {formatPrice(MONTHLY_FEE)}
                </span>
                <span className="mb-2 text-lg text-white/50">{t("plans.per_month")}</span>
              </div>
              <p className="mt-2 text-sm text-white/60">
                {t("plans.pricing_note")}
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
                {t("plans.try_free")} <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-white/40">
                {t("plans.no_charge_cancel")}
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-8">
          <h2 className="mb-6 font-display text-xl font-bold sm:text-2xl">
            {t("plans.faq_title")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Faq
              q={t("plans.faq_q1")}
              a={t("plans.faq_a1", { price: formatPrice(MONTHLY_FEE) })}
            />
            <Faq
              q={t("plans.faq_q2")}
              a={t("plans.faq_a2")}
            />
            <Faq
              q={t("plans.faq_q3")}
              a={t("plans.faq_a3")}
            />
            <Faq
              q={t("plans.faq_q4")}
              a={t("plans.faq_a4", { price: formatPrice(MONTHLY_FEE) })}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-white/50 sm:px-10">
          <div>© {new Date().getFullYear()} Lumo</div>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-white">
              {t("plans.footer_terms")}
            </Link>
            <Link to="/privacy" className="hover:text-white">
              {t("plans.footer_privacy")}
            </Link>
            <Link to="/login" className="hover:text-white">
              {t("plans.footer_login")}
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
  const { t } = useTranslation();
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
            <ChevronLeft className="h-4 w-4" /> {t("plans.back")}
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
            <Sparkles className="h-3.5 w-3.5" /> {t("plans.club_subscription_badge")}
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            {t("plans.create_account_title")}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {t("plans.create_account_subtitle", {
              price: formatPrice(MONTHLY_FEE),
              date: nextChargeDate,
            })}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <FormSection
            step={1}
            title={t("plans.club_info_title")}
            description={t("plans.club_info_desc")}
          >
            <Field
              label={t("plans.club_name_field")}
              required
              value={info.clubName}
              onChange={(v) => setField("clubName", v)}
              placeholder={t("plans.club_name_placeholder")}
            />
          </FormSection>

          <FormSection
            step={2}
            title={t("plans.admin_account_title")}
            description={t("plans.admin_account_desc")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("plans.admin_name_label")}
                required
                value={info.adminName}
                onChange={(v) => setField("adminName", v)}
                placeholder={t("plans.admin_name_placeholder")}
              />
              <Field
                label={t("plans.admin_email_label")}
                required
                type="email"
                value={info.adminEmail}
                onChange={(v) => setField("adminEmail", v)}
                placeholder={t("plans.admin_email_placeholder")}
              />
              <Field
                label={t("plans.password_label")}
                required
                type="password"
                value={info.adminPassword}
                onChange={(v) => setField("adminPassword", v)}
                placeholder={t("plans.password_min")}
                hint={t("plans.password_hint")}
                className="sm:col-span-2"
              />
            </div>
          </FormSection>

          <div className="rounded-2xl border border-lime-400/30 bg-lime-400/10 p-5 text-sm">
            <p className="font-display text-base font-bold text-lime-200">
              {t("plans.pricing_box_title", { price: formatPrice(MONTHLY_FEE) })}
            </p>
            <p className="mt-1.5 text-white/70">
              {t("plans.pricing_box_desc", {
                price: formatPrice(MONTHLY_FEE),
                date: nextChargeDate,
              })}
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
            {submitting ? t("plans.continuing") : t("plans.continue_to_payment")}
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
  const { t } = useTranslation();
  const { clientSecret, nextChargeDate, onSuccess, onBack } = props;
  const promise = getStripePromise();

  if (!promise) {
    return (
      <PaymentShell onBack={onBack}>
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {t("plans.missing_stripe_key")}
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
  const { t } = useTranslation();
  return (
    <div className="relative min-h-screen bg-ink-950 text-white">
      <div className="hero-gradient absolute inset-0 -z-10" />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> {t("plans.back")}
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
            <Lock className="h-3.5 w-3.5" /> {t("plans.secure_badge")}
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            {t("plans.payment_title")}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {t("plans.payment_subtitle", { price: formatPrice(MONTHLY_FEE) })}
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
  const { t } = useTranslation();
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

    const { error: err, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/plans",
      },
      redirect: "if_required",
    });

    if (err) {
      setError(err.message ?? t("plans.error_save_card"));
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
              {t("plans.card_title")}
            </h2>
            <p className="mt-1 text-sm text-white/60">
              {t("plans.card_desc")}
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
          {t("plans.trial_note_title")}
        </p>
        <p className="mt-1.5 text-white/70">
          {t("plans.trial_note_desc", {
            date: nextChargeDate,
            price: formatPrice(MONTHLY_FEE),
          })}
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
        {submitting ? t("plans.confirming") : t("plans.activate_trial")}
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </button>

      <p className="pb-6 text-center text-xs text-white/50">
        {t("plans.secure_note")}
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
  locale,
}: {
  result: SignupResult;
  password: string;
  locale: string;
}) {
  const { t } = useTranslation();
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
            {t("plans.success_badge")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            {t("plans.success_title", { name: result.club.name })}
          </h1>
          <p className="mt-3 text-sm text-white/70">
            {t("plans.success_desc", {
              date: formatDate(result.subscription.trialEndsAt, locale),
              price: formatPrice(result.subscription.monthlyFee),
            })}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
          <h2 className="font-display text-base font-bold text-white">
            {t("plans.credentials_title")}
          </h2>
          <p className="mt-1 text-sm text-white/60">
            {t("plans.credentials_desc")}
          </p>

          <div className="mt-4 space-y-3">
            <CredentialRow
              label={t("plans.credential_email_label")}
              value={result.admin.email}
              copied={copied === "email"}
              onCopy={() => copy("email", result.admin.email)}
            />
            <CredentialRow
              label={t("plans.credential_password_label")}
              value={password}
              copied={copied === "password"}
              onCopy={() => copy("password", password)}
            />
          </div>

          <Link
            to={result.loginUrl}
            className="btn-accent mt-6 h-12 w-full text-base"
          >
            {t("plans.go_to_club")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/70">
          <p className="font-display text-base font-bold text-white">
            {t("plans.whats_next")}
          </p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
              <span>{t("plans.next_add_members")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
              <span>{t("plans.next_plan_trainings")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-300" />
              <span>{t("plans.next_set_fees")}</span>
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
  const { t } = useTranslation();
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
        {copied ? t("plans.copied") : t("plans.copy")}
      </button>
    </div>
  );
}

function MarketingPopup({
  open,
  onClose,
  onCta,
}: {
  open: boolean;
  onClose: () => void;
  onCta: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl animate-[fadeUp_0.35s_ease-out] overflow-hidden rounded-3xl border border-white/10 bg-ink-950 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Uždaryti"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Image */}
        <div className="relative">
          <img
            src="/marketing-preview.png"
            alt="Lumo — sporto klubų valdymo platforma"
            className="w-full object-cover"
            draggable={false}
          />
          {/* Bottom gradient overlay so text reads cleanly */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink-950 to-transparent" />
        </div>

        {/* Content */}
        <div className="px-7 pb-7 pt-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-lime-300">
            <Sparkles className="h-3 w-3" /> {t("plans.badge")}
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">
            {t("plans.hero_title_1")}<br />{t("plans.hero_title_2")}
          </h2>
          <p className="mt-2 text-sm text-white/60">
            {t("plans.hero_subtitle")}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onCta}
              className="btn-accent h-11 px-6 text-sm"
            >
              {t("plans.try_free")} <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="text-sm font-semibold text-white/40 hover:text-white/70 transition-colors"
            >
              {t("plans.see_price")}
            </button>
          </div>

          <p className="mt-3 text-xs text-white/30">
            {t("plans.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}
