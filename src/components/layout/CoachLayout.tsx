import { Outlet, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Trophy,
  Users2,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { UserMenu } from "../ui/UserMenu";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { ToastContainer } from "../ui/ToastContainer";
import { BackgroundLogo } from "./BackgroundLogo";
import { useStore } from "../../store/useStore";

export function CoachLayout() {
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const clubName = useStore((s) => s.authUser?.clubName ?? "");
  const clubLogo = useStore((s) => s.authUser?.clubLogo ?? null);
  const logoSrc = clubLogo || "/lumo-logo.png";

  const items = [
    { to: "/coach/trainings", label: t("nav.trainings"), icon: BarChart3, end: false },
    { to: "/coach/training-templates", label: t("nav.training_plans"), icon: ClipboardList },
    { to: "/coach/schedule", label: t("nav.my_calendar"), icon: CalendarDays },
    { to: "/coach/members", label: t("nav.members"), icon: Users2 },
    { to: "/coach/leaderboards", label: t("nav.results"), icon: Trophy },
    { to: "/coach/profile", label: t("nav.profile"), icon: UserCog },
  ];

  return (
    <div className="relative min-h-screen">
      <BackgroundLogo />
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-ink-100 bg-white p-4 md:flex md:flex-col dark:border-ink-800 dark:bg-ink-900 md:sticky md:top-0 md:h-screen">
          <div className="mb-6 flex items-center gap-2 px-1 font-display text-lg font-bold text-ink-900 dark:text-lime-400">
            <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-xl bg-ink-900">
              <img
                src={logoSrc}
                alt={clubName || "Lumo"}
                className="h-full w-full object-contain"
              />
            </span>
            {clubName}
            <span className="ml-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              {t("roles.coach_badge")}
            </span>
          </div>
          <SidebarNav items={items} />
          <div className="mt-auto space-y-2">
            <div className="flex justify-end px-1 pb-1">
              <LanguageSwitcher />
            </div>
            <UserMenu variant="full" />
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85 md:hidden">
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 dark:border-ink-700"
                aria-label={t("common.toggle_nav")}
              >
                {mobileNavOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </button>
              <div className="flex items-center gap-2 font-display text-base font-bold text-ink-900 dark:text-lime-400">
                {clubName}
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                  {t("roles.coach_badge")}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <LanguageSwitcher />
                <UserMenu />
              </div>
            </div>
            {mobileNavOpen && (
              <div className="border-t border-ink-100 p-3 dark:border-ink-800">
                <SidebarNav items={items} onNavigate={() => setMobileNavOpen(false)} />
              </div>
            )}
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

function SidebarNav({
  items,
  onNavigate,
}: {
  items: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean }[];
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              isActive
                ? "bg-ink-900 text-white dark:bg-lime-400 dark:text-ink-950"
                : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800",
            )
          }
        >
          <it.icon className="h-4 w-4" />
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
