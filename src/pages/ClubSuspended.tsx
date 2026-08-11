import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  ExternalLink,
  LogOut,
  Mail,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useStore } from "../store/useStore";
import {
  deleteClub,
  fetchPayInvoiceUrl,
  fetchSubscription,
  reactivateSubscription,
} from "../api/subscription";
import { ApiError } from "../api/client";

// Shown to any user in a club whose subscription is past_due or cancelled.
// Admins can pay/reactivate directly from here. Coaches/members get a
// message asking them to contact the admin.
export default function ClubSuspended() {
  const { t } = useTranslation();
  const authUser = useStore((s) => s.authUser);
  const status = useStore((s) => s.subscriptionStatus);
  const logout = useStore((s) => s.logout);
  const setSubscriptionStatus = useStore((s) => s.setSubscriptionStatus);
  const push = useStore((s) => s.pushToast);

  const [busy, setBusy] = useState<
    "pay" | "reactivate" | "refresh" | "delete" | null
  >(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();

  const isAdmin = authUser?.role === "admin";
  const clubName = authUser?.clubName ?? "";
  const pastDue = status === "past_due";
  const cancelled = status === "cancelled";

  // Non-admin roles won't have permission to fetch subscription details, but
  // we can display the admin email as a contact hint. Skip this call for now
  // since we don't have a public admin-lookup endpoint.
  useEffect(() => {
    setAdminEmail(null);
  }, []);

  const refresh = async () => {
    setBusy("refresh");
    try {
      const sub = await fetchSubscription();
      setSubscriptionStatus(sub.status);
      if (sub.status === "trialing" || sub.status === "active") {
        push({ kind: "success", message: "Klubas atgaivintas." });
        window.location.reload();
      } else {
        push({ kind: "info", message: "Prenumeratos būsena vis dar suspenduota." });
      }
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "Nepavyko patikrinti būsenos.",
      });
    } finally {
      setBusy(null);
    }
  };

  const openPayInvoice = async () => {
    setBusy("pay");
    try {
      const { url } = await fetchPayInvoiceUrl();
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        push({ kind: "info", message: "Neapmokėtų sąskaitų nėra." });
      }
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError ? err.message : "Nepavyko gauti sąskaitos.",
      });
    } finally {
      setBusy(null);
    }
  };

  const doReactivate = async () => {
    setBusy("reactivate");
    try {
      const sub = await reactivateSubscription();
      setSubscriptionStatus(sub.status);
      push({ kind: "success", message: "Prenumerata atnaujinta." });
      window.location.reload();
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError ? err.message : "Nepavyko atnaujinti.",
      });
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    setBusy("delete");
    try {
      await deleteClub();
      logout();
      navigate("/plans", { replace: true });
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError ? err.message : "Nepavyko ištrinti klubo.",
      });
      setBusy(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-ink-950 text-white">
      <div className="hero-gradient absolute inset-0 -z-10" />

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src="/lumo-logo.png" alt="Lumo" className="h-7 w-auto" />
            {clubName && (
              <span className="text-sm font-semibold text-white/60">
                — {clubName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> {t("common.logout")}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div
              className="absolute -inset-3 rounded-full bg-red-500/20 blur-2xl"
              aria-hidden
            />
            <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-300 ring-4 ring-red-500/10">
              {cancelled ? (
                <Ban className="h-8 w-8" strokeWidth={2.5} />
              ) : (
                <AlertTriangle className="h-8 w-8" strokeWidth={2.5} />
              )}
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-red-300">
            {cancelled ? t("admin_subscription.cancelled") : t("club_suspended.title")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            {t("club_suspended.title")}
          </h1>
          <p className="mt-3 text-sm text-white/70">
            {isAdmin ? t("club_suspended.admin_desc") : t("club_suspended.desc")}
          </p>
        </div>

        {isAdmin ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <h2 className="font-display text-base font-bold text-white">
              {t("club_suspended.manage_subscription")}
            </h2>

            <div className="mt-5 flex flex-col gap-2">
              {pastDue && (
                <button
                  type="button"
                  onClick={openPayInvoice}
                  disabled={busy !== null}
                  className="btn-accent h-12 w-full text-base"
                >
                  <ExternalLink className="h-4 w-4" />
                  {busy === "pay" ? t("common.loading") : t("admin_subscription.cancel")}
                </button>
              )}
              {cancelled && (
                <button
                  type="button"
                  onClick={doReactivate}
                  disabled={busy !== null}
                  className="btn-accent h-12 w-full text-base"
                >
                  <ArrowRight className="h-4 w-4" />
                  {busy === "reactivate"
                    ? t("common.loading")
                    : t("admin_subscription.resume")}
                </button>
              )}
              <Link
                to="/admin/subscription"
                className="btn-outline h-12 w-full text-base"
                style={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                {t("admin_subscription.stripe_dashboard")}
              </Link>
              <button
                type="button"
                onClick={refresh}
                disabled={busy !== null}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white"
              >
                <RefreshCw
                  className={`h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`}
                />
                {t("common.update")}
              </button>
            </div>

            {cancelled && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy !== null}
                  className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-500/10 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  {busy === "delete" ? t("common.loading") : t("common.delete")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/70">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  {t("club_suspended.desc")}
                </h2>
                {adminEmail && (
                  <p className="mt-3 text-sm text-white">
                    <strong>{t("common.email")}:</strong>{" "}
                    <a
                      href={`mailto:${adminEmail}`}
                      className="text-lime-300 hover:underline"
                    >
                      {adminEmail}
                    </a>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={busy !== null}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <RefreshCw
                className={`h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`}
              />
              {t("common.update")}
            </button>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          void doDelete();
        }}
        title={t("admin_subscription.cancel_confirm")}
        message={t("club_suspended.admin_desc")}
        confirmLabel={t("common.yes")}
        destructive
      />
    </div>
  );
}
