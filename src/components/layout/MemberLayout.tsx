import { Outlet, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import { UserMenu } from "../ui/UserMenu";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { MobileBottomNav } from "./MobileBottomNav";
import { ToastContainer } from "../ui/ToastContainer";
import { BackgroundLogo } from "./BackgroundLogo";
import { useStore } from "../../store/useStore";

export function MemberLayout() {
  const { t } = useTranslation();
  const clubName = useStore((s) => s.authUser?.clubName ?? "");
  const clubLogo = useStore((s) => s.authUser?.clubLogo ?? null);
  const logoSrc = clubLogo || "/lumo-logo.png";
  return (
    <div className="relative min-h-screen">
      <BackgroundLogo />
      <header className="safe-top sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-lime-400">
            <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-xl bg-ink-900">
              <img
                src={logoSrc}
                alt={clubName || "Lumo"}
                className="h-full w-full object-contain"
              />
            </span>
            {clubName}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <NavLink
              to="/member/help"
              title={t("nav.help")}
              className={({ isActive }) =>
                `grid h-8 w-8 place-items-center rounded-full border transition-colors ${
                  isActive
                    ? "border-lime-400 bg-lime-400/10 text-lime-600 dark:text-lime-300"
                    : "border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800"
                }`
              }
              aria-label={t("nav.help")}
            >
              <HelpCircle className="h-4 w-4" />
            </NavLink>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-40 pt-4">
        <Outlet />
      </main>

      <MobileBottomNav />
      <ToastContainer />
    </div>
  );
}
