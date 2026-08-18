import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { CalendarCheck2, Home, MessageCircle, Trophy, User } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function MobileBottomNav() {
  const { t } = useTranslation();
  const hasUnreadChat = useStore((s) => s.hasUnreadChat);

  const items = [
    { to: '/member', label: t('nav.home'), icon: Home, end: true, tourId: 'nav-home' },
    { to: '/member/trainings', label: t('nav.trainings'), icon: CalendarCheck2, tourId: 'nav-trainings' },
    { to: '/member/chat', label: t('nav.chat'), icon: MessageCircle, tourId: 'nav-chat' },
    { to: '/member/leaderboards', label: t('nav.results'), icon: Trophy, tourId: 'nav-leaderboards' },
    { to: '/member/profile', label: t('nav.profile'), icon: User, tourId: 'nav-profile' },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 backdrop-blur dark:border-ink-800 dark:bg-ink-950/95"
      aria-label={t('nav.main')}
    >
      <div className="mx-auto grid max-w-4xl grid-cols-5 safe-bottom">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            data-tour={it.tourId}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors',
                isActive
                  ? 'text-ink-900 dark:text-lime-400'
                  : 'text-ink-500 hover:text-ink-800 dark:text-ink-400',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={clsx(
                    'relative grid h-8 w-8 place-items-center rounded-xl transition-all',
                    isActive && 'bg-ink-900/5 dark:bg-lime-400/15',
                  )}
                >
                  <it.icon className="h-5 w-5" />
                  {it.to.endsWith('/chat') && hasUnreadChat && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-lime-500" />
                  )}
                </span>
                {it.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
