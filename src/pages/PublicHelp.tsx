import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  Bug,
  Check,
  Clock,
  Copy,
  Lightbulb,
  Mail,
  MessageCircle,
} from "lucide-react";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";
import { BookingCalendar } from "../components/ui/BookingCalendar";

const EMAIL = "info@lumosport.lt";

export default function PublicHelp() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-lg font-bold text-white">
            Lumo
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              to="/login"
              className="text-sm font-semibold text-white/60 hover:text-white"
            >
              {t("auth.sign_in_btn")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Page heading */}
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-lime-400">
            {t("help.eyebrow")}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            {t("help.title")}
          </h1>
          <p className="mt-1 text-sm text-white/60">{t("help.description")}</p>
        </div>

        {/* Contact card */}
        <section className="overflow-hidden rounded-2xl bg-white">
          <div className="h-1.5 bg-gradient-to-r from-lime-400 to-green-500" />
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-400/15 text-lime-600">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-ink-900">
                  {t("help.hero_title")}
                </h2>
                <p className="mt-1 text-sm text-ink-500">{t("help.hero_subtitle")}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3">
              <Mail className="h-4 w-4 shrink-0 text-ink-400" />
              <span className="flex-1 select-all font-mono text-sm font-semibold text-ink-900">
                {EMAIL}
              </span>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-lime-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? t("help.copied") : t("help.copy")}
              </button>
            </div>

            <div className="mt-5">
              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex items-center gap-2 rounded-xl bg-ink-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
              >
                <Mail className="h-4 w-4" />
                {t("help.email_btn")}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-ink-500">
              <Clock className="h-4 w-4 shrink-0 text-lime-500" />
              <span>{t("help.response_time")}</span>
            </div>
          </div>
        </section>

        {/* Reason cards */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: MessageCircle, title: t("help.reason_q_title"), desc: t("help.reason_q_desc") },
            { icon: Bug, title: t("help.reason_bug_title"), desc: t("help.reason_bug_desc") },
            { icon: Lightbulb, title: t("help.reason_suggest_title"), desc: t("help.reason_suggest_desc") },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-white p-4">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-lime-600">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="mt-3 font-display text-sm font-bold text-ink-900">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* Booking calendar */}
        <BookingCalendar />
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Lumo ·{" "}
        <Link to="/terms" className="hover:text-white">
          {t("common.terms")}
        </Link>{" "}
        ·{" "}
        <Link to="/privacy" className="hover:text-white">
          {t("common.privacy")}
        </Link>
      </footer>
    </div>
  );
}
