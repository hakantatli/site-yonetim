import { create } from 'zustand';
import type { User, TokenPairResponse } from '../api/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (data: TokenPairResponse) => void;
  logout: () => void;
}

const getItem = (key: string): string | null => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
  return localStorage.getItem(key);
};

const setItem = (key: string, value: string): void => {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

const removeItem = (key: string): void => {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
};

const getStoredUser = (): User | null => {
  const stored = getItem('auth_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  accessToken: getItem('access_token'),
  refreshToken: getItem('refresh_token'),
  isAuthenticated: !!getItem('access_token'),

  setAuth: (data: TokenPairResponse) => {
    setItem('access_token', data.access_token);
    setItem('refresh_token', data.refresh_token);
    setItem('auth_user', JSON.stringify(data.user));

    set({
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      isAuthenticated: true,
    });
  },

  logout: () => {
    removeItem('access_token');
    removeItem('refresh_token');
    removeItem('auth_user');

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
