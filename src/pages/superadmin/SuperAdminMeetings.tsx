import { useEffect, useState } from "react";
import { Calendar, Mail, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageTitle } from "../../components/layout/PageTitle";
import { fetchSuperAdminMeetings, type MeetingRecord } from "../../api/superadmin";

function endTime(startTime: string): string {
  const [h] = startTime.split(":").map(Number);
  return `${String(h + 1).padStart(2, "0")}:00`;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("lt-LT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SuperAdminMeetings() {
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuperAdminMeetings()
      .then(setMeetings)
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = meetings.filter((m) => m.date >= today);
  const past = meetings.filter((m) => m.date < today);

  return (
    <div className="max-w-3xl">
      <PageTitle
        eyebrow={t("meetings.eyebrow")}
        title={t("meetings.title")}
        description={t("meetings.description")}
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800"
            />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="surface flex flex-col items-center gap-3 py-12 text-center">
          <Calendar className="h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">{t("meetings.empty")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">
                Būsimi ({upcoming.length})
              </h2>
              <div className="space-y-2">
                {upcoming.map((m) => (
                  <MeetingCard key={m.id} meeting={m} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-400 dark:text-ink-500">
                Praeiti ({past.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {[...past].reverse().map((m) => (
                  <MeetingCard key={m.id} meeting={m} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MeetingCard({ meeting: m }: { meeting: MeetingRecord }) {
  const { t } = useTranslation();
  return (
    <div className="surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-600 dark:text-lime-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-ink-900 dark:text-ink-50 capitalize">
              {formatDate(m.date)}
            </p>
            <p className="mt-0.5 text-sm font-bold text-lime-600 dark:text-lime-400">
              {m.startTime}–{endTime(m.startTime)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-sm sm:text-right">
          <div className="flex items-center gap-2 sm:justify-end">
            <Mail className="h-3.5 w-3.5 shrink-0 text-ink-400" />
            <span className="font-semibold text-ink-900 dark:text-ink-100">
              {m.bookedByName}
            </span>
          </div>
          <a
            href={`mailto:${m.bookedByEmail}`}
            className="text-xs text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200"
          >
            {m.bookedByEmail}
          </a>
        </div>
      </div>

      {m.inviteEmails.length > 0 && (
        <div className="mt-3 flex items-start gap-2 border-t border-ink-100 pt-3 dark:border-ink-700">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
          <div>
            <p className="text-xs font-semibold text-ink-500 dark:text-ink-400">
              {t("meetings.invited")}
            </p>
            <p className="mt-0.5 text-xs text-ink-700 dark:text-ink-300">
              {m.inviteEmails.join(", ")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
