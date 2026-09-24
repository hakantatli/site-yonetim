export interface MeterType {
  id: string;
  site_id: string;
  name: string;
  unit: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateMeterTypePayload {
  name: string;
  unit: string;
}

export interface UpdateMeterTypePayload {
  name: string;
  unit: string;
  is_active: boolean;
}

export interface ConsumptionPeriod {
  id: string;
  site_id: string;
  meter_type_id: string;
  meter_type_name: string;
  meter_type_unit: string;
  period: string; // YYYY-MM-DD
  main_meter_previous: number;
  main_meter_current: number;
  total_billed_consumption: number;
  total_apartments_consumption: number;
  common_area_consumption: number;
  total_bill_amount: number;
  unit_cost: number;
  common_area_cost: number;
  bill_date?: string | null;
  bill_no?: string | null;
  description?: string | null;
  reading_count: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeterReading {
  id: string;
  consumption_period_id: string;
  apartment_id: string;
  door_number: string;
  block_name?: string | null;
  debtor_user_id?: string | null;
  debtor_full_name?: string | null;
  debtor_phone?: string | null;
  previous_reading: number;
  current_reading: number;
  consumption: number;
  individual_amount: number;
  common_area_amount: number;
  total_amount: number;
  debt_id?: string | null;
  debt_status?: string | null;
  reading_date: string;
  notes?: string | null;
  created_at: string;
}

export interface ApartmentLastReading {
  apartment_id: string;
  door_number: string;
  block_name?: string | null;
  last_reading: number;
  previous_debt?: number;
}

export interface PreviousReadingsResponse {
  main_meter_previous: number;
  apartments: ApartmentLastReading[];
}

export interface ReadingInput {
  apartment_id: string;
  previous_reading: number;
  current_reading: number;
  notes?: string;
}

export interface CreateConsumptionPeriodPayload {
  meter_type_id: string;
  period: string; // YYYY-MM
  main_meter_previous: number;
  main_meter_current: number;
  total_bill_amount: number;
  bill_date?: string;
  bill_no?: string;
  description?: string;
  readings: ReadingInput[];
}

export interface ResidentMeterHistoryItem {
  reading_id: string;
  reading_date: string;
  previous_reading: number;
  current_reading: number;
  consumption: number;
  individual_amount: number;
  common_area_amount: number;
  total_amount: number;
  debt_id?: string | null;
  debt_status?: string | null;
  period: string;
  bill_date?: string | null;
  bill_no?: string | null;
  total_bill_amount: number;
  unit_cost: number;
  total_billed_consumption: number;
  common_area_consumption: number;
  meter_type_name: string;
  meter_type_unit: string;
}
