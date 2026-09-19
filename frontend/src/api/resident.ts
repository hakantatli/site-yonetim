import { apiClient } from './client';
import type { DebtDetail } from '../types/due';
import type { PaymentDetail } from '../types/payment';

export const residentApi = {
  getResidentDebts: async (): Promise<DebtDetail[]> => {
    const response = await apiClient.get<DebtDetail[]>('/resident/me/debts');
    return response.data;
  },

  getResidentPayments: async (): Promise<PaymentDetail[]> => {
    const response = await apiClient.get<PaymentDetail[]>('/resident/me/payments');
    return response.data;
  },
};
