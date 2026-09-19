import { apiClient } from './client';
import type {
  Payment,
  PaymentDetail,
  PaymentStats,
  RecordPaymentRequest,
  PaymentFilter,
} from '../types/payment';

export const paymentApi = {
  recordPayment: async (payload: RecordPaymentRequest, siteId?: string): Promise<Payment> => {
    const url = siteId ? `/sites/${siteId}/admin/payments` : '/admin/payments';
    const res = await apiClient.post(url, payload, { params: siteId ? { siteId } : {} });
    return res.data;
  },

  getPayments: async (params?: PaymentFilter & { siteId?: string }): Promise<PaymentDetail[]> => {
    const siteId = params?.siteId;
    const url = siteId ? `/sites/${siteId}/admin/payments` : '/admin/payments';
    const res = await apiClient.get(url, { params });
    return res.data;
  },

  getPaymentStats: async (siteId?: string): Promise<PaymentStats> => {
    const url = siteId ? `/sites/${siteId}/admin/payments/stats` : '/admin/payments/stats';
    const res = await apiClient.get(url, { params: siteId ? { siteId } : {} });
    return res.data;
  },

  getPaymentById: async (id: string, siteId?: string): Promise<PaymentDetail> => {
    const url = siteId ? `/sites/${siteId}/admin/payments/${id}` : `/admin/payments/${id}`;
    const res = await apiClient.get(url, { params: siteId ? { siteId } : {} });
    return res.data;
  },

  deletePayment: async (id: string, siteId?: string): Promise<{ message: string }> => {
    const url = siteId ? `/sites/${siteId}/admin/payments/${id}` : `/admin/payments/${id}`;
    const res = await apiClient.delete(url, { params: siteId ? { siteId } : {} });
    return res.data;
  },

  getPaymentsByDebt: async (debtId: string, siteId?: string): Promise<PaymentDetail[]> => {
    const url = siteId ? `/sites/${siteId}/admin/debts/${debtId}/payments` : `/admin/debts/${debtId}/payments`;
    const res = await apiClient.get(url, { params: siteId ? { siteId } : {} });
    return res.data;
  },
};
