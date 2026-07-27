import { useLocation } from 'react-router-dom';

// Trainings pages live under both `/coach/trainings/*` (coach access) and
// `/admin/trainings/*` (admin access). Rather than duplicate the components,
// they derive their base path + eyebrow from the current URL.
export function useTrainingsBase(): {
  base: string;
  isAdmin: boolean;
  eyebrow: string;
} {
  const isAdmin = useLocation().pathname.startsWith('/admin');
  return {
    base: isAdmin ? '/admin/trainings' : '/coach/trainings',
    isAdmin,
    eyebrow: isAdmin ? 'Administratorius' : 'Treneris',
  };
}
