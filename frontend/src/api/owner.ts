import { apiClient } from './client';
import type { User } from './auth';

export interface SiteItem {
  id: string;
  name: string;
  address?: string | null;
  apartment_limit: number;
  created_at: string;
  updated_at: string;
  apartment_count: number;
  admin_count: number;
}

export interface SiteDetailResponse extends SiteItem {
  block_count: number;
  resident_count: number;
  admins: User[];
}

export interface CreateSitePayload {
  name: string;
  address?: string;
  apartment_limit?: number;
}

export interface CreateAdminPayload {
  phone: string;
  email?: string;
  password: string;
  full_name: string;
}

export const ownerApi = {
  listSites: async (): Promise<SiteItem[]> => {
    const { data } = await apiClient.get<SiteItem[]>('/owner/sites');
    return data;
  },

  createSite: async (payload: CreateSitePayload): Promise<SiteItem> => {
    const { data } = await apiClient.post<SiteItem>('/owner/sites', payload);
    return data;
  },

  getSiteDetails: async (siteId: string): Promise<SiteDetailResponse> => {
    const { data } = await apiClient.get<SiteDetailResponse>(`/owner/sites/${siteId}`);
    return data;
  },

  updateLimit: async (siteId: string, limit: number): Promise<SiteItem> => {
    const { data } = await apiClient.patch<SiteItem>(`/owner/sites/${siteId}/limit`, {
      apartment_limit: limit,
    });
    return data;
  },

  createAdmin: async (siteId: string, payload: CreateAdminPayload): Promise<User> => {
    const { data } = await apiClient.post<User>(`/owner/sites/${siteId}/admins`, payload);
    return data;
  },
};
