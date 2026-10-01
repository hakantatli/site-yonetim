import { describe, it, expect } from 'vitest';
import { formatDateTR, formatPeriodMonthYear } from './date';

describe('formatDateTR', () => {
  it('formats YYYY-MM-DD to DD.MM.YYYY', () => {
    expect(formatDateTR('2026-09-15')).toBe('15.09.2026');
  });

  it('handles ISO date string with time', () => {
    expect(formatDateTR('2026-09-15T12:00:00Z')).toBe('15.09.2026');
  });

  it('returns - for empty or null', () => {
    expect(formatDateTR(null)).toBe('-');
    expect(formatDateTR(undefined)).toBe('-');
    expect(formatDateTR('')).toBe('-');
  });
});

describe('formatPeriodMonthYear', () => {
  it('extracts Turkish month and year from YYYY-MM-DD due_month', () => {
    expect(formatPeriodMonthYear('2026-09-01', null)).toBe('Eylül 2026');
    expect(formatPeriodMonthYear('2026-01-01', null)).toBe('Ocak 2026');
    expect(formatPeriodMonthYear('2026-12-01', null)).toBe('Aralık 2026');
  });

  it('extracts Turkish month and year from YYYY-MM due_month', () => {
    expect(formatPeriodMonthYear('2026-08', null)).toBe('Ağustos 2026');
  });

  it('extracts month and year from description when due_month is missing', () => {
    expect(
      formatPeriodMonthYear(null, '09/2026 Su Tüketim Bedeli (12.00 m³ x ₺45.00)')
    ).toBe('Eylül 2026');
    expect(formatPeriodMonthYear(null, '2026-07 Aidat Borcu')).toBe('Temmuz 2026');
    expect(formatPeriodMonthYear(null, 'Ağustos 2026 Aidatı')).toBe('Ağustos 2026');
  });

  it('returns empty string when no period is found', () => {
    expect(formatPeriodMonthYear(null, 'Genel Gider')).toBe('');
    expect(formatPeriodMonthYear(null, null)).toBe('');
  });
});
