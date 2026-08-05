import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthToken } from '../api/client';
import { useStore } from '../store/useStore';

// Landing page for super-admin impersonation. Reached in a NEW tab as
// /impersonate?imp=1&token=<JWT>. The `?imp=1` flag flips this tab's persist
// storage to sessionStorage (see useStore.ts) so we don't clobber the
// super-admin session held in the original tab's localStorage. We then prime
// the store with the token, boot the session, and redirect to the target's
// home dashboard.
export default function ImpersonateLanding() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    if (!token) {
      setError('Trūksta prieigos rakto.');
      return;
    }

    // Strip the token from the URL so it doesn't sit in browser history.
    // Keep `imp=1` so persist keeps using sessionStorage for this tab.
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.toString());

    setAuthToken(token);
    useStore.setState({ token });

    void useStore
      .getState()
      .bootstrap()
      .then(() => {
        const role = useStore.getState().authUser?.role;
        const target =
          role === 'admin'
            ? '/admin'
            : role === 'coach'
              ? '/coach'
              : role === 'member'
                ? '/member'
                : '/login';
        navigate(target, { replace: true });
      })
      .catch(() => setError('Nepavyko įkelti sesijos.'));
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 text-white">
      <div className="flex flex-col items-center gap-3">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-lime-400" />
            <p className="text-sm text-white/70">Prisijungiama…</p>
          </>
        )}
      </div>
    </div>
  );
}
