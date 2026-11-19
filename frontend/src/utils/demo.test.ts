import { describe, it, expect } from 'vitest';
import { isDemoUser } from './demo';

describe('isDemoUser', () => {
  it('returns false for null or undefined user', () => {
    expect(isDemoUser(null)).toBe(false);
    expect(isDemoUser(undefined)).toBe(false);
  });

  it('returns true for demo admin phone', () => {
    expect(isDemoUser({ phone: '05551234567' })).toBe(true);
    expect(isDemoUser({ phone: '0555 123 45 67' })).toBe(true);
    expect(isDemoUser({ phone: '5551234567' })).toBe(true);
  });

  it('returns true for demo resident phone', () => {
    expect(isDemoUser({ phone: '05423010001' })).toBe(true);
    expect(isDemoUser({ phone: '0542 301 00 01' })).toBe(true);
  });

  it('returns true for demo admin email', () => {
    expect(isDemoUser({ email: 'yonetici@cinarpark.com' })).toBe(true);
    expect(isDemoUser({ email: 'YONETICI@CINARPARK.COM' })).toBe(true);
  });

  it('returns false for standard users', () => {
    expect(isDemoUser({ phone: '05329998877', email: 'user@example.com' })).toBe(false);
  });
});
