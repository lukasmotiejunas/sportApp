import { api } from './client';

export type ConnectStatus =
  | {
      connected: false;
      ready: false;
      chargesEnabled: false;
      payoutsEnabled: false;
      requirementsDue: string[];
      bankLast4: null;
    }
  | {
      connected: true;
      id: string;
      ready: boolean;
      chargesEnabled: boolean;
      payoutsEnabled: boolean;
      requirementsDue: string[];
      bankLast4: string | null;
      bankName: string | null;
    };

export const fetchConnectStatus = () =>
  api.get<ConnectStatus>('/connect/status');

export const startConnectOnboarding = () =>
  api.post<{ url: string; accountId: string }>('/connect/onboard', {});

export const openConnectDashboard = () =>
  api.post<{ url: string }>('/connect/dashboard', {});
