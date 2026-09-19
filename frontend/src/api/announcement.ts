import { apiClient } from './client';
import type {
  Announcement,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
} from '../types/announcement';

const getBaseUrl = (siteId?: string) => (siteId ? `/sites/${siteId}/admin` : '/admin');

export const announcementApi = {
  listAnnouncements: async (siteId?: string): Promise<Announcement[]> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    const { data } = await apiClient.get<Announcement[]>(`${base}/announcements${queryString}`);
    return data;
  },

  createAnnouncement: async (payload: CreateAnnouncementPayload, siteId?: string): Promise<Announcement> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    const { data } = await apiClient.post<Announcement>(`${base}/announcements${queryString}`, payload);
    return data;
  },

  getAnnouncement: async (id: string, siteId?: string): Promise<Announcement> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    const { data } = await apiClient.get<Announcement>(`${base}/announcements/${id}${queryString}`);
    return data;
  },

  updateAnnouncement: async (
    id: string,
    payload: UpdateAnnouncementPayload,
    siteId?: string
  ): Promise<Announcement> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    const { data } = await apiClient.patch<Announcement>(`${base}/announcements/${id}${queryString}`, payload);
    return data;
  },

  deleteAnnouncement: async (id: string, siteId?: string): Promise<void> => {
    const base = getBaseUrl(siteId);
    const queryString = siteId ? `?siteId=${siteId}` : '';
    await apiClient.delete(`${base}/announcements/${id}${queryString}`);
  },

  getResidentAnnouncements: async (): Promise<Announcement[]> => {
    const { data } = await apiClient.get<Announcement[]>('/resident/announcements');
    return data;
  },
};
