import { Outlet, NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  Users,
  UserPlus,
  CreditCard,
  Receipt,
  UserCog,
  LayoutDashboard,
  Wallet,
  BarChart3,
  Trophy,
  ClipboardList,
} from "lucide-react";
import { UserMenu } from "../ui/UserMenu";
import { ToastContainer } from "../ui/ToastContainer";
import { BackgroundLogo } from "./BackgroundLogo";
import { useStore } from "../../store/useStore";

const items = [
  { to: "/admin", label: "Skydelis", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Paskyros", icon: Users, end: false },
  { to: "/admin/trainings", label: "Treniruotės", icon: BarChart3, end: false },
  { to: "/admin/training-templates", label: "Treniruočių planai", icon: ClipboardList, end: false },
  { to: "/admin/leaderboards", label: "Rezultatai", icon: Trophy, end: false },
  { to: "/admin/payments", label: "Mokėjimai", icon: Wallet, end: false },
  { to: "/admin/plans", label: "Narystės planai", icon: CreditCard, end: false },
  { to: "/admin/subscription", label: "Prenumerata", icon: Receipt, end: false },
  { to: "/admin/profile", label: "Profilis", icon: UserCog, end: false },
  { to: "/admin/coaches/new", label: "Pridėti trenerį", icon: UserPlus },
];

export function AdminLayout() {
  const clubName = useStore((s) => s.authUser?.clubName ?? "");
  const clubLogo = useStore((s) => s.authUser?.clubLogo ?? null);
  const logoSrc = clubLogo || "/lumo-logo.png";
  return (
    <div className="relative min-h-screen">
      <BackgroundLogo />
      <div className="flex">
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
              Admin
            </span>
          </div>
          <nav className="flex flex-col gap-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
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
          <div className="mt-auto space-y-2">
            <UserMenu variant="full" />
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85 md:hidden">
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="flex items-center gap-2 font-display text-base font-bold text-ink-900 dark:text-lime-400">
                {clubName}
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                  Admin
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <UserMenu />
              </div>
            </div>
            <div className="flex gap-1 border-t border-ink-100 p-2 dark:border-ink-800">
              {items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    clsx(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold",
                      isActive
                        ? "bg-ink-900 text-white dark:bg-lime-400 dark:text-ink-950"
                        : "text-ink-600 hover:bg-ink-100 dark:text-ink-300",
                    )
                  }
                >
                  <it.icon className="h-3.5 w-3.5" />
                  {it.label}
                </NavLink>
              ))}
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
