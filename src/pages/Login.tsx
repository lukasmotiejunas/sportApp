import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Dumbbell, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";
import { useStore } from "../store/useStore";
import type { Role } from "../types";
import { fetchPublicClubs, type PublicClubListItem } from "../api/public";

const roleHome: Record<Role, string> = {
  super_admin: "/superadmin",
  admin: "/admin",
  coach: "/coach",
  member: "/member",
};

export default function Login() {
  const { t } = useTranslation();
  const login = useStore((s) => s.login);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await login(email.trim(), password);
    setSubmitting(false);
    if (res.ok) {
      const role = useStore.getState().authUser?.role ?? "member";
      navigate(roleHome[role]);
    } else {
      setError(res.error ?? t("auth.error_default"));
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="relative isolate mx-auto grid min-h-screen max-w-5xl grid-cols-1 lg:grid-cols-2">
        <div className="hero-gradient absolute inset-0 -z-10" />
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitcher />
        </div>
        <div className="flex flex-col items-center justify-center gap-8 p-6 sm:p-10">
          <img
            src="/lumo-logo.png"
            alt="Lumo"
            className="w-72 max-w-full sm:w-96 lg:w-[28rem] xl:w-[32rem]"
          />
          <div className="max-w-md text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t("auth.sign_in_title")}
            </h1>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4 rounded-t-3xl bg-white p-6 text-ink-900 shadow-pop sm:p-10 lg:rounded-none lg:rounded-l-3xl">
          <h2 className="font-display text-xl font-bold">{t("auth.form_title")}</h2>
          <p className="text-sm text-ink-500">
            {t("auth.form_subtitle")}
          </p>

          <form onSubmit={submit} className="mt-2 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-700">
                {t("common.email")}
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-ink-900"
                placeholder="jus@pavyzdys.lt"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-ink-700">
                  {t("common.password")}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-ink-400 hover:text-ink-700"
                >
                  {t("auth.forgot_password")}
                </Link>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-ink-900"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 font-semibold text-white transition-all hover:bg-ink-800 disabled:opacity-60"
            >
              {submitting ? t("auth.signing_in") : t("auth.sign_in_btn")}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-ink-400">
            <span className="h-px flex-1 bg-ink-200" />
            {t("common.or")}
            <span className="h-px flex-1 bg-ink-200" />
          </div>

          <ClubDirectory />

          <div className="mt-2 rounded-2xl border border-lime-300 bg-lime-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400 text-ink-950">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-ink-900">
                  {t("auth.club_promo_title")}
                </p>
                <p className="mt-1 text-xs text-ink-700">
                  {t("auth.club_promo_desc")}
                </p>
              </div>
            </div>
            <Link
              to="/plans"
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-950 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
            >
              {t("auth.create_club")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-ink-400">
            <Link to="/terms" className="hover:text-ink-700">
              {t("common.terms")}
            </Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-ink-700">
              {t("common.privacy")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClubDirectory() {
  const [clubs, setClubs] = useState<PublicClubListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicClubs()
      .then(setClubs)
      .catch(() => setClubs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mt-6 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded-full bg-ink-100" />
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-ink-100" />
            <div className="h-4 w-32 animate-pulse rounded-full bg-ink-100" />
          </div>
        ))}
      </div>
    );
  }

  if (clubs.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900 text-white">
          <Dumbbell className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-sm font-bold text-ink-900">Ieškote sporto klubo?</p>
          <p className="text-xs text-ink-500">Pasirinkite klubą ir registruokitės narystei</p>
        </div>
      </div>

      <ul className="space-y-2">
        {clubs.map((club) => (
          <li key={club.id}>
            <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50/60 p-3 transition-colors hover:border-ink-200 hover:bg-ink-100/60">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-900">
                {club.logoUrl ? (
                  <img
                    src={club.logoUrl}
                    alt={club.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {club.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">
                {club.name}
              </p>
              <Link
                to={`/join/${club.slug}`}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-ink-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-ink-700"
              >
                Registruotis
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
