import { apiClient } from './client';

export interface User {
  id: string;
  phone: string;
  email?: string | null;
  full_name: string;
  role: 'owner' | 'admin' | 'resident';
  site_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenPairResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  user: User;
}

export interface LoginPayload {
  login?: string;
  phone?: string;
  email?: string;
  password: string;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<TokenPairResponse> => {
    const { data } = await apiClient.post<TokenPairResponse>('/auth/login', payload);
    return data;
  },

  refresh: async (refreshToken: string): Promise<TokenPairResponse> => {
    const { data } = await apiClient.post<TokenPairResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return data;
  },

  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken });
      }
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_user');
    }
  },

  getMe: async (): Promise<{ user_id: string; email: string; role: 'owner' | 'admin' | 'resident'; site_id?: string | null }> => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },
};
