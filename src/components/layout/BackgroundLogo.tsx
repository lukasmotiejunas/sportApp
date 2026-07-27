import { useStore } from '../../store/useStore';

// Fixed watermark rendered behind all page content when the user is logged in.
// Shows the club's uploaded logo (if any) or the platform Lumo logo otherwise.
// Non-interactive: `pointer-events-none` so it never captures clicks.
export function BackgroundLogo() {
  const clubLogo = useStore((s) => s.authUser?.clubLogo ?? null);
  const src = clubLogo || '/lumo-logo.png';

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center"
    >
      <img
        src={src}
        alt=""
        className="max-h-[70vh] w-[min(70vw,720px)] object-contain opacity-[0.04] dark:opacity-[0.05]"
      />
    </div>
  );
}
