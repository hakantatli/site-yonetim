import { apiClient } from './client';
import type {
  ExpenseCategory,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  Expense,
  CreateExpensePayload,
  ExpenseFilter,
  ExpenseListResponse,
  TreasurySummary,
  UpdateInitialBalancePayload,
} from '../types/expense';

const getBaseUrl = (siteId?: string) => (siteId ? `/sites/${siteId}/admin` : '/admin');

export const expenseApi = {
  // Categories
  listCategories: async (all?: boolean, siteId?: string): Promise<ExpenseCategory[]> => {
    const base = getBaseUrl(siteId);
    const params = new URLSearchParams();
    if (all) params.append('all', 'true');
    if (siteId) params.append('siteId', siteId);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const { data } = await apiClient.get<ExpenseCategory[]>(`${base}/expense-categories${queryString}`);
    return data;
  },

  createCategory: async (payload: CreateCategoryPayload, siteId?: string): Promise<ExpenseCategory> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    const { data } = await apiClient.post<ExpenseCategory>(`${base}/expense-categories${queryString}`, payload);
    return data;
  },

  updateCategory: async (
    id: string,
    payload: UpdateCategoryPayload,
    siteId?: string
  ): Promise<ExpenseCategory> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    const { data } = await apiClient.patch<ExpenseCategory>(`${base}/expense-categories/${id}${queryString}`, payload);
    return data;
  },

  deleteCategory: async (id: string, siteId?: string): Promise<{ message: string }> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    const { data } = await apiClient.delete<{ message: string }>(`${base}/expense-categories/${id}${queryString}`);
    return data;
  },

  // Expenses
  listExpenses: async (filter?: ExpenseFilter, siteId?: string): Promise<ExpenseListResponse> => {
    const base = getBaseUrl(siteId);
    const params = new URLSearchParams();
    if (filter?.category_id) params.append('category_id', filter.category_id);
    if (filter?.start_date) params.append('start_date', filter.start_date);
    if (filter?.end_date) params.append('end_date', filter.end_date);
    if (siteId) params.append('siteId', siteId);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const { data } = await apiClient.get<ExpenseListResponse>(`${base}/expenses${queryString}`);
    return data;
  },

  createExpense: async (payload: CreateExpensePayload, siteId?: string): Promise<Expense> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    const { data } = await apiClient.post<Expense>(`${base}/expenses${queryString}`, payload);
    return data;
  },

  deleteExpense: async (id: string, siteId?: string): Promise<{ message: string }> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    const { data } = await apiClient.delete<{ message: string }>(`${base}/expenses/${id}${queryString}`);
    return data;
  },

  // Treasury
  getAdminTreasury: async (siteId?: string): Promise<TreasurySummary> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    const { data } = await apiClient.get<TreasurySummary>(`${base}/treasury${queryString}`);
    return data;
  },

  getResidentTreasury: async (): Promise<TreasurySummary> => {
    const { data } = await apiClient.get<TreasurySummary>('/resident/treasury');
    return data;
  },

  updateInitialBalance: async (
    payload: UpdateInitialBalancePayload,
    siteId?: string
  ): Promise<{ message: string; initial_balance: number }> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    const { data } = await apiClient.patch<{ message: string; initial_balance: number }>(
      `${base}/treasury/initial-balance${queryString}`,
      payload
    );
    return data;
  },
};

