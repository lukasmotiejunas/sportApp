import { api } from './client';
import type { ClubSubscription, SubscriptionPayment } from '../types';

export const fetchSubscription = () =>
  api.get<ClubSubscription>('/subscription');

export const fetchSubscriptionPayments = () =>
  api.get<SubscriptionPayment[]>('/subscription/payments');

export const cancelSubscription = () =>
  api.post<ClubSubscription>('/subscription/cancel');

export const resumeSubscription = () =>
  api.post<ClubSubscription>('/subscription/resume');

export const reactivateSubscription = () =>
  api.post<ClubSubscription>('/subscription/reactivate');

export const fetchPayInvoiceUrl = () =>
  api.get<{ url: string | null }>('/subscription/pay-invoice-url');

export const deleteClub = () => api.del<void>('/subscription/club');
