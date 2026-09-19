import { apiClient } from './client';
import type {
  DueRateSummary,
  SetDueRatePayload,
  DueRate,
  DebtListResponse,
  CreateManualDebtPayload,
  AccrueResult,
  DebtDetail,
} from '../types/due';

export const dueApi = {
  getDueRates: async (siteId?: string): Promise<DueRateSummary> => {
    const url = siteId ? `/sites/${siteId}/admin/due-rates` : '/admin/due-rates';
    const res = await apiClient.get(url, { params: siteId ? { siteId } : {} });
    return res.data;
  },

  setDueRate: async (payload: SetDueRatePayload, siteId?: string): Promise<DueRate> => {
    const url = siteId ? `/sites/${siteId}/admin/due-rates` : '/admin/due-rates';
    const res = await apiClient.post(url, payload, { params: siteId ? { siteId } : {} });
    return res.data;
  },

  getDebts: async (params?: {
    status?: string;
    type?: string;
    apartment_id?: string;
    debtor_user_id?: string;
    siteId?: string;
  }): Promise<DebtListResponse> => {
    const siteId = params?.siteId;
    const url = siteId ? `/sites/${siteId}/admin/debts` : '/admin/debts';
    const res = await apiClient.get(url, { params });
    return res.data;
  },

  getDebtById: async (id: string, siteId?: string): Promise<DebtDetail> => {
    const url = siteId ? `/sites/${siteId}/admin/debts/${id}` : `/admin/debts/${id}`;
    const res = await apiClient.get(url, { params: siteId ? { siteId } : {} });
    return res.data;
  },

  createManualDebt: async (payload: CreateManualDebtPayload, siteId?: string): Promise<DebtDetail> => {
    const url = siteId ? `/sites/${siteId}/admin/debts` : '/admin/debts';
    const res = await apiClient.post(url, payload, { params: siteId ? { siteId } : {} });
    return res.data;
  },

  createBulkDebt: async (payload: import('../types/due').CreateBulkDebtPayload, siteId?: string): Promise<import('../types/due').BulkDebtResult> => {
    const url = siteId ? `/sites/${siteId}/admin/debts/bulk` : '/admin/debts/bulk';
    const res = await apiClient.post(url, payload, { params: siteId ? { siteId } : {} });
    return res.data;
  },


  accrueMonthlyDues: async (targetMonth?: string, siteId?: string): Promise<AccrueResult> => {
    const url = siteId ? `/sites/${siteId}/admin/debts/accrue-monthly` : '/admin/debts/accrue-monthly';
    const res = await apiClient.post(
      url,
      { target_month: targetMonth || undefined },
      { params: siteId ? { siteId } : {} }
    );
    return res.data;
  },

  deleteDebt: async (id: string, siteId?: string): Promise<{ message: string }> => {
    const url = siteId ? `/sites/${siteId}/admin/debts/${id}` : `/admin/debts/${id}`;
    const res = await apiClient.delete(url, { params: siteId ? { siteId } : {} });
    return res.data;
  },
};
