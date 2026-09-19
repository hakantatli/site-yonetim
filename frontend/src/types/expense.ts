export interface ExpenseCategory {
  id: string;
  site_id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CreateCategoryPayload {
  name: string;
}

export interface UpdateCategoryPayload {
  name: string;
  is_active?: boolean;
}

export interface Expense {
  id: string;
  site_id: string;
  category_id: string;
  category_name: string;
  amount: number;
  description?: string | null;
  expense_date: string;
  receipt_note?: string | null;
  recorded_by: string;
  recorded_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpensePayload {
  category_id: string;
  amount: number;
  expense_date?: string;
  description?: string;
  receipt_note?: string;
}

export interface ExpenseFilter {
  category_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface ExpenseStats {
  total_amount: number;
  this_month_amount: number;
  total_count: number;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  stats: ExpenseStats;
}

export interface CategoryBreakdownItem {
  category_id: string;
  category_name: string;
  total_amount: number;
  expense_count: number;
  percentage: number;
}

export interface MonthlyFlowItem {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface TreasurySummary {
  initial_balance: number;
  total_income: number;
  total_expense: number;
  net_balance: number;
  this_month_income: number;
  this_month_expense: number;
  this_month_net: number;
  category_breakdown: CategoryBreakdownItem[];
  monthly_flow: MonthlyFlowItem[];
}

export interface UpdateInitialBalancePayload {
  initial_balance: number;
}

