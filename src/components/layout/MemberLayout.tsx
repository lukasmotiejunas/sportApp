import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85">
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
