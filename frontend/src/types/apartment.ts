export interface Block {
  id: string;
  site_id: string;
  name: string;
  created_at: string;
}

export interface Apartment {
  id: string;
  site_id: string;
  block_id?: string | null;
  block_name?: string | null;
  door_number: string;
  floor?: number | null;
  owner_user_id?: string | null;
  owner_full_name?: string | null;
  owner_phone?: string | null;
  owner_email?: string | null;
  tenant_user_id?: string | null;
  tenant_full_name?: string | null;
  tenant_phone?: string | null;
  tenant_email?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResidentInput {
  full_name: string;
  phone: string;
  email?: string;
  password?: string;
}

export interface CreateApartmentRequest {
  block_id?: string;
  door_number: string;
  floor?: number;
  owner?: ResidentInput;
  tenant?: ResidentInput;
}

export interface UpdateApartmentRequest {
  block_id?: string;
  door_number: string;
  floor?: number;
}

export interface RemoveTenantRequest {
  debt_action: 'keep' | 'transfer' | 'delete';
  notes?: string;
}

export interface TenantHistoryItem {
  id: string;
  apartment_id: string;
  tenant_user_id: string;
  tenant_full_name: string;
  tenant_phone: string;
  tenant_email?: string | null;
  started_at: string;
  ended_at?: string | null;
  debt_action?: 'keep' | 'transfer' | 'delete' | null;
  notes?: string | null;
  created_at: string;
}
