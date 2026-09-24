import { describe, it, expect } from 'vitest';
import { cleanPhone, formatPhone, maskPhoneInput } from './phone';

describe('Phone Utility Tests', () => {
  describe('cleanPhone', () => {
    it('strips non-digits and keeps standard 05xx format', () => {
      expect(cleanPhone('0(506) 658 8775')).toBe('05066588775');
      expect(cleanPhone('0506 658 87 75')).toBe('05066588775');
    });

    it('adds leading zero if 10 digits provided starting with 5', () => {
      expect(cleanPhone('5066588775')).toBe('05066588775');
    });

    it('returns empty string for empty input', () => {
      expect(cleanPhone('')).toBe('');
      expect(cleanPhone(null)).toBe('');
      expect(cleanPhone(undefined)).toBe('');
    });
  });

  describe('formatPhone', () => {
    it('formats standard 11-digit Turkish phone to 0(5XX) XXX XXXX', () => {
      expect(formatPhone('05066588775')).toBe('0(506) 658 8775');
      expect(formatPhone('05321112233')).toBe('0(532) 111 2233');
    });

    it('formats 10-digit Turkish phone to 0(5XX) XXX XXXX', () => {
      expect(formatPhone('5066588775')).toBe('0(506) 658 8775');
    });

    it('returns original if not a valid 11/10 digit phone', () => {
      expect(formatPhone('12345')).toBe('12345');
    });

    it('returns hyphen for empty input', () => {
      expect(formatPhone('')).toBe('-');
      expect(formatPhone(null)).toBe('-');
    });
  });

  describe('maskPhoneInput', () => {
    it('formats progressively as user types', () => {
      expect(maskPhoneInput('0')).toBe('0');
      expect(maskPhoneInput('05')).toBe('0(5');
      expect(maskPhoneInput('0506')).toBe('0(506');
      expect(maskPhoneInput('05066')).toBe('0(506) 6');
      expect(maskPhoneInput('0506658')).toBe('0(506) 658');
      expect(maskPhoneInput('05066588')).toBe('0(506) 658 8');
      expect(maskPhoneInput('05066588775')).toBe('0(506) 658 8775');
    });

    it('automatically prepends 0 if user starts typing 5', () => {
      expect(maskPhoneInput('5')).toBe('0(5');
      expect(maskPhoneInput('5066588775')).toBe('0(506) 658 8775');
    });

    it('truncates beyond 11 digits', () => {
      expect(maskPhoneInput('0506658877599999')).toBe('0(506) 658 8775');
    });
  });
});
