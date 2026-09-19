import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth';
import type { TokenPairResponse } from '../api/auth';

// In-memory mock for localStorage in Node test environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'window', {
  value: { localStorage: storageMock },
  writable: true,
});
Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

describe('useAuthStore', () => {
  beforeEach(() => {
    storageMock.clear();
    useAuthStore.getState().logout();
  });

  it('initializes with unauthenticated state when localStorage is empty', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('setAuth stores tokens and sets isAuthenticated to true', () => {
    const mockAuthData: TokenPairResponse = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: '2026-09-20T00:00:00Z',
      user: {
        id: 'user-1',
        full_name: 'Ahmet Yılmaz',
        phone: '05551234567',
        role: 'admin',
        site_id: 'site-123',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    };

    useAuthStore.getState().setAuth(mockAuthData);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('mock-access-token');
    expect(state.refreshToken).toBe('mock-refresh-token');
    expect(state.user?.full_name).toBe('Ahmet Yılmaz');
    expect(state.user?.role).toBe('admin');
    expect(localStorage.getItem('access_token')).toBe('mock-access-token');
  });

  it('logout clears state and removes items from localStorage', () => {
    const mockAuthData: TokenPairResponse = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: '2026-09-20T00:00:00Z',
      user: {
        id: 'user-2',
        full_name: 'Ayşe Demir',
        phone: '05559876543',
        role: 'resident',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    };

    useAuthStore.getState().setAuth(mockAuthData);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
