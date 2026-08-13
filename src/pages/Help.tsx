import { useState } from "react";
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
import { PageTitle } from "../components/layout/PageTitle";
import { BookingCalendar } from "../components/ui/BookingCalendar";

const EMAIL = "info@lumosport.lt";

export default function Help() {
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
    <div className="max-w-2xl">
      <PageTitle
        eyebrow={t("help.eyebrow")}
        title={t("help.title")}
        description={t("help.description")}
      />

      {/* Main contact card */}
      <section className="surface overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-lime-400 to-green-500" />

        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-400/15 text-lime-600 dark:text-lime-300">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-ink-900 dark:text-ink-50">
                {t("help.hero_title")}
              </h2>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                {t("help.hero_subtitle")}
              </p>
            </div>
          </div>

          {/* Email address row */}
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3 dark:border-ink-700 dark:bg-ink-800/50">
            <Mail className="h-4 w-4 shrink-0 text-ink-400" />
            <span className="flex-1 font-mono text-sm font-semibold text-ink-900 dark:text-ink-50 select-all">
              {EMAIL}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-ink-50 dark:border-ink-600 dark:bg-ink-700 dark:text-ink-200 dark:hover:bg-ink-600"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-lime-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? t("help.copied") : t("help.copy")}
            </button>
          </div>

          {/* CTA */}
          <div className="mt-5">
            <a
              href={`mailto:${EMAIL}`}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {t("help.email_btn")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Response time */}
          <div className="mt-4 flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
            <Clock className="h-4 w-4 shrink-0 text-lime-500" />
            <span>{t("help.response_time")}</span>
          </div>
        </div>
      </section>

      {/* Three reason cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ReasonCard
          icon={MessageCircle}
          title={t("help.reason_q_title")}
          desc={t("help.reason_q_desc")}
        />
        <ReasonCard
          icon={Bug}
          title={t("help.reason_bug_title")}
          desc={t("help.reason_bug_desc")}
        />
        <ReasonCard
          icon={Lightbulb}
          title={t("help.reason_suggest_title")}
          desc={t("help.reason_suggest_desc")}
        />
      </div>

      <BookingCalendar />
    </div>
  );
}

function ReasonCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="surface p-4">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400/10 text-lime-600 dark:text-lime-300">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-3 font-display text-sm font-bold text-ink-900 dark:text-ink-50">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
        {desc}
      </p>
    </div>
  );
}
