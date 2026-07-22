import { Navigate } from "react-router-dom";
import { useStore } from "../../store/useStore";
import type { Role } from "../../types";

type Props = {
  roles: Role[];
  children: React.ReactNode;
};

// Guards a route group: redirects to /login when unauthenticated, or to the
// user's own home when they have the wrong role.
export function RequireRole({ roles, children }: Props) {
  const authUser = useStore((s) => s.authUser);

  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(authUser.role)) {
    const home =
      authUser.role === "admin"
        ? "/admin"
        : authUser.role === "coach"
          ? "/coach"
          : "/member";
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
