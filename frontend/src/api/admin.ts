import { apiClient } from './client';
import type { Apartment, Block, CreateApartmentRequest, UpdateApartmentRequest, ResidentInput, RemoveTenantRequest, TenantHistoryItem } from '../types/apartment';

export const adminApi = {
  // Blocks
  listBlocks: async (siteId?: string): Promise<Block[]> => {
    const { data } = await apiClient.get<Block[]>('/admin/blocks', {
      params: siteId ? { siteId } : undefined,
    });
    return data;
  },

  createBlock: async (name: string, siteId?: string): Promise<Block> => {
    const { data } = await apiClient.post<Block>(
      '/admin/blocks',
      { name },
      { params: siteId ? { siteId } : undefined }
    );
    return data;
  },

  deleteBlock: async (id: string, siteId?: string): Promise<void> => {
    await apiClient.delete(`/admin/blocks/${id}`, {
      params: siteId ? { siteId } : undefined,
    });
  },

  // Apartments
  listApartments: async (siteId?: string): Promise<Apartment[]> => {
    const { data } = await apiClient.get<Apartment[]>('/admin/apartments', {
      params: siteId ? { siteId } : undefined,
    });
    return data;
  },

  getApartment: async (id: string, siteId?: string): Promise<Apartment> => {
    const { data } = await apiClient.get<Apartment>(`/admin/apartments/${id}`, {
      params: siteId ? { siteId } : undefined,
    });
    return data;
  },

  createApartment: async (payload: CreateApartmentRequest, siteId?: string): Promise<Apartment> => {
    const { data } = await apiClient.post<Apartment>('/admin/apartments', payload, {
      params: siteId ? { siteId } : undefined,
    });
    return data;
  },

  updateApartment: async (id: string, payload: UpdateApartmentRequest, siteId?: string): Promise<Apartment> => {
    const { data } = await apiClient.patch<Apartment>(`/admin/apartments/${id}`, payload, {
      params: siteId ? { siteId } : undefined,
    });
    return data;
  },

  softDeleteApartment: async (id: string, siteId?: string): Promise<void> => {
    await apiClient.delete(`/admin/apartments/${id}`, {
      params: siteId ? { siteId } : undefined,
    });
  },

  // Residents
  setOwner: async (apartmentId: string, resident: ResidentInput, siteId?: string): Promise<Apartment> => {
    const { data } = await apiClient.post<Apartment>(
      `/admin/apartments/${apartmentId}/owner`,
      resident,
      { params: siteId ? { siteId } : undefined }
    );
    return data;
  },

  setTenant: async (apartmentId: string, resident: ResidentInput, siteId?: string): Promise<Apartment> => {
    const { data } = await apiClient.post<Apartment>(
      `/admin/apartments/${apartmentId}/tenant`,
      resident,
      { params: siteId ? { siteId } : undefined }
    );
    return data;
  },

  removeTenant: async (apartmentId: string, payload: RemoveTenantRequest, siteId?: string): Promise<Apartment> => {
    const { data } = await apiClient.delete<Apartment>(
      `/admin/apartments/${apartmentId}/tenant`,
      {
        data: payload,
        params: siteId ? { siteId } : undefined,
      }
    );
    return data;
  },

  listTenantHistory: async (apartmentId: string): Promise<TenantHistoryItem[]> => {
    const { data } = await apiClient.get<TenantHistoryItem[]>(
      `/admin/apartments/${apartmentId}/tenant-history`
    );
    return data;
  },
};
