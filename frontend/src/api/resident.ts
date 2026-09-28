import { apiClient } from './client';
import type { DebtDetail } from '../types/due';
import type { PaymentDetail } from '../types/payment';
import type { UserApartment } from '../types/apartment';

export const residentApi = {
  getMyApartments: async (): Promise<UserApartment[]> => {
    const response = await apiClient.get<UserApartment[]>('/resident/me/apartments');
    return response.data;
  },

  getResidentDebts: async (siteId?: string): Promise<DebtDetail[]> => {
    const response = await apiClient.get<DebtDetail[]>('/resident/me/debts', {
      params: siteId ? { site_id: siteId } : undefined,
    });
    return response.data;
  },

  getResidentPayments: async (siteId?: string): Promise<PaymentDetail[]> => {
    const response = await apiClient.get<PaymentDetail[]>('/resident/me/payments', {
      params: siteId ? { site_id: siteId } : undefined,
    });
    return response.data;
  },
};

