import { apiClient } from './client';
import type {
  MeterType,
  CreateMeterTypePayload,
  UpdateMeterTypePayload,
  ConsumptionPeriod,
  MeterReading,
  PreviousReadingsResponse,
  CreateConsumptionPeriodPayload,
  ResidentMeterHistoryItem,
} from '../types/meter';

export const meterApi = {
  // Meter Types
  listMeterTypes: async (all?: boolean, siteId?: string): Promise<MeterType[]> => {
    const { data } = await apiClient.get<MeterType[]>('/admin/meters/types', {
      params: {
        ...(siteId ? { siteId } : {}),
        ...(all ? { all: 'true' } : {}),
      },
    });
    return data;
  },

  createMeterType: async (payload: CreateMeterTypePayload, siteId?: string): Promise<MeterType> => {
    const { data } = await apiClient.post<MeterType>('/admin/meters/types', payload, {
      params: siteId ? { siteId } : undefined,
    });
    return data;
  },

  updateMeterType: async (id: string, payload: UpdateMeterTypePayload, siteId?: string): Promise<MeterType> => {
    const { data } = await apiClient.patch<MeterType>(`/admin/meters/types/${id}`, payload, {
      params: siteId ? { siteId } : undefined,
    });
    return data;
  },

  deleteMeterType: async (id: string, siteId?: string): Promise<void> => {
    await apiClient.delete(`/admin/meters/types/${id}`, {
      params: siteId ? { siteId } : undefined,
    });
  },

  // Previous Readings
  getPreviousReadings: async (meterTypeId: string, siteId?: string): Promise<PreviousReadingsResponse> => {
    const { data } = await apiClient.get<PreviousReadingsResponse>('/admin/meters/previous-readings', {
      params: {
        meter_type_id: meterTypeId,
        ...(siteId ? { siteId } : {}),
      },
    });
    return data;
  },

  // Consumption Periods
  listConsumptionPeriods: async (siteId?: string): Promise<ConsumptionPeriod[]> => {
    const { data } = await apiClient.get<ConsumptionPeriod[]>('/admin/meters/periods', {
      params: siteId ? { siteId } : undefined,
    });
    return data;
  },

  createConsumptionPeriod: async (
    payload: CreateConsumptionPeriodPayload,
    siteId?: string
  ): Promise<{ period: ConsumptionPeriod; readings: MeterReading[] }> => {
    if (payload.invoice) {
      const { invoice, ...jsonPayload } = payload;
      const formData = new FormData();
      formData.append('payload', JSON.stringify(jsonPayload));
      formData.append('invoice', invoice);

      const { data } = await apiClient.post<{ period: ConsumptionPeriod; readings: MeterReading[] }>(
        '/admin/meters/periods',
        formData,
        {
          params: siteId ? { siteId } : undefined,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return data;
    }

    const { data } = await apiClient.post<{ period: ConsumptionPeriod; readings: MeterReading[] }>(
      '/admin/meters/periods',
      payload,
      { params: siteId ? { siteId } : undefined }
    );
    return data;
  },

  getPeriodInvoiceUrl: (periodId: string, siteId?: string): string => {
    const token = localStorage.getItem('access_token');
    const params = new URLSearchParams();
    if (token) params.append('token', token);
    if (siteId) params.append('siteId', siteId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return `/api/v1/admin/meters/periods/${periodId}/invoice${queryString}`;
  },

  getResidentPeriodInvoiceUrl: (periodId: string, siteId?: string): string => {
    const token = localStorage.getItem('access_token');
    const params = new URLSearchParams();
    if (token) params.append('token', token);
    if (siteId) params.append('site_id', siteId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return `/api/v1/resident/meters/periods/${periodId}/invoice${queryString}`;
  },

  getConsumptionPeriod: async (
    id: string,
    siteId?: string
  ): Promise<{ period: ConsumptionPeriod; readings: MeterReading[] }> => {
    const { data } = await apiClient.get<{ period: ConsumptionPeriod; readings: MeterReading[] }>(
      `/admin/meters/periods/${id}`,
      { params: siteId ? { siteId } : undefined }
    );
    return data;
  },

  deleteConsumptionPeriod: async (id: string, siteId?: string): Promise<void> => {
    await apiClient.delete(`/admin/meters/periods/${id}`, {
      params: siteId ? { siteId } : undefined,
    });
  },

  // Resident Meter History
  getResidentMeterHistory: async (siteId?: string): Promise<ResidentMeterHistoryItem[]> => {
    const { data } = await apiClient.get<ResidentMeterHistoryItem[]>('/resident/meters/history', {
      params: siteId ? { site_id: siteId } : undefined,
    });
    return data;
  },
};
