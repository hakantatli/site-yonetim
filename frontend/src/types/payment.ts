export type PaymentMethod = 'cash' | 'transfer';

export interface Payment {
  id: string;
  debt_id: string;
  site_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface PaymentDetail extends Payment {
  recorded_by_name: string;
  debt_type: string;
  debt_due_month?: string;
  debt_description?: string;
  debt_total_amount: number;
  door_number: string;
  block_name?: string;
  debtor_full_name: string;
  debtor_phone: string;
}

export interface PaymentStats {
  total_collected: number;
  cash_total: number;
  transfer_total: number;
  total_count: number;
}

export interface RecordPaymentRequest {
  debt_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date?: string;
  notes?: string;
}

export interface PaymentFilter {
  debt_id?: string;
  apartment_id?: string;
  payment_method?: string;
  start_date?: string;
  end_date?: string;
}
