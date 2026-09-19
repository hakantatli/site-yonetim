export type DebtType = 'monthly_due' | 'fixture' | 'investment' | 'other' | 'utility';
export type DebtStatus = 'open' | 'partial' | 'paid';

export interface DueRate {
  id: string;
  site_id: string;
  amount: number;
  valid_from: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface DueRateSummary {
  current_rate: DueRate | null;
  upcoming_rate?: DueRate | null;
  history: DueRate[];
}

export interface SetDueRatePayload {
  amount: number;
  effective_type: 'this_month' | 'next_month' | 'custom';
  valid_from?: string;
}

export interface DebtDetail {
  id: string;
  site_id: string;
  apartment_id: string;
  debtor_user_id: string;
  type: DebtType;
  amount: number;
  due_month?: string | null;
  description?: string | null;
  status: DebtStatus;
  created_at: string;
  paid_amount: number;
  remaining: number;
  door_number: string;
  block_name?: string;
  debtor_full_name: string;
  debtor_phone: string;
}

export interface DebtStats {
  total_amount: number;
  total_paid: number;
  total_remaining: number;
  total_count: number;
  open_count: number;
  partial_count: number;
  paid_count: number;
}

export interface DebtListResponse {
  debts: DebtDetail[];
  stats: DebtStats;
}

export interface CreateManualDebtPayload {
  apartment_id: string;
  debtor_user_id?: string;
  type: DebtType;
  amount: number;
  due_month?: string;
  description: string;
}

export interface AccrueResult {
  target_month: string;
  created_count: number;
  skipped_count: number;
  amount: number;
}

export interface CreateBulkDebtPayload {
  type: DebtType;
  amount: number;
  due_month?: string;
  description: string;
  debtor_target?: 'owner' | 'auto';
}

export interface BulkDebtResult {
  created_count: number;
  skipped_count: number;
  total_amount: number;
  apartment_ids: string[];
}

