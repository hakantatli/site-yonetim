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
    const { data } = await apiClient.post<{ period: ConsumptionPeriod; readings: MeterReading[] }>(
      '/admin/meters/periods',
      payload,
      { params: siteId ? { siteId } : undefined }
    );
    return data;
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
  getResidentMeterHistory: async (): Promise<ResidentMeterHistoryItem[]> => {
    const { data } = await apiClient.get<ResidentMeterHistoryItem[]>('/resident/meters/history');
    return data;
  },
};
