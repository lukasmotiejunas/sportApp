import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setDone(true);
    } catch {
      setError(t("common.error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="relative isolate mx-auto grid min-h-screen max-w-5xl grid-cols-1 lg:grid-cols-2">
        <div className="hero-gradient absolute inset-0 -z-10" />
        <div className="flex flex-col items-center justify-center gap-8 p-6 sm:p-10">
          <img
            src="/lumo-logo.png"
            alt="Lumo"
            className="w-72 max-w-full sm:w-96 lg:w-[28rem] xl:w-[32rem]"
          />
        </div>

        <div className="flex flex-col justify-center gap-4 rounded-t-3xl bg-white p-6 text-ink-900 shadow-pop sm:p-10 lg:rounded-none lg:rounded-l-3xl">
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("forgot_password.back_to_login")}
          </Link>

          {done ? (
            <div className="mt-4 flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-100">
                <CheckCircle className="h-7 w-7 text-lime-600" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">{t("forgot_password.success_title")}</h2>
                <p className="mt-2 text-sm text-ink-500">
                  {t("forgot_password.success_desc")}
                </p>
              </div>
              <Link
                to="/login"
                className="mt-2 text-sm font-semibold text-ink-900 underline underline-offset-2 hover:text-ink-600"
              >
                {t("forgot_password.back_to_login")}
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-display text-xl font-bold">{t("forgot_password.title")}</h2>
                <p className="mt-1 text-sm text-ink-500">
                  {t("forgot_password.subtitle")}
                </p>
              </div>

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

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-2xl bg-ink-950 font-semibold text-white transition-all hover:bg-ink-800 disabled:opacity-60"
                >
                  {submitting ? t("forgot_password.sending") : t("forgot_password.send_btn")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
