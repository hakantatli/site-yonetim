/**
 * Turkish date and period formatting utilities.
 */

export const TURKISH_MONTH_NAMES = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;

/**
 * Formats YYYY-MM-DD or ISO date string to DD.MM.YYYY
 */
export function formatDateTR(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

/**
 * Extracts and formats the period month and year into Turkish display (e.g. "Eylül 2026").
 * Searches both dueMonth (e.g. "2026-09-01", "2026-09") and description (e.g. "09/2026", "2026-09").
 */
export function formatPeriodMonthYear(
  dueMonth?: string | null,
  description?: string | null
): string {
  // 1. Try to extract from dueMonth
  if (dueMonth && typeof dueMonth === 'string') {
    const clean = dueMonth.trim().split('T')[0];
    const parts = clean.split(/[-/ ]/);
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (
        !isNaN(year) &&
        !isNaN(month) &&
        month >= 1 &&
        month <= 12 &&
        year >= 2000 &&
        year <= 2100
      ) {
        return `${TURKISH_MONTH_NAMES[month - 1]} ${year}`;
      }
    }
  }

  // 2. Try to extract from description
  if (description && typeof description === 'string') {
    // Check for MM/YYYY pattern (e.g., "09/2026")
    const mSlash = description.match(/\b(0[1-9]|1[0-2])\/(\d{4})\b/);
    if (mSlash) {
      const month = parseInt(mSlash[1], 10);
      const year = parseInt(mSlash[2], 10);
      return `${TURKISH_MONTH_NAMES[month - 1]} ${year}`;
    }

    // Check for YYYY-MM pattern (e.g., "2026-09")
    const mDash = description.match(/\b(\d{4})-(0[1-9]|1[0-2])\b/);
    if (mDash) {
      const year = parseInt(mDash[1], 10);
      const month = parseInt(mDash[2], 10);
      return `${TURKISH_MONTH_NAMES[month - 1]} ${year}`;
    }

    // Check for Turkish month name (e.g., "Eylül 2026")
    const mTurkish = description.match(
      /\b(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)(?:\s+(\d{4}))?\b/i
    );
    if (mTurkish) {
      const rawName = mTurkish[1];
      const mName =
        rawName.charAt(0).toLocaleUpperCase('tr-TR') +
        rawName.slice(1).toLocaleLowerCase('tr-TR');
      return mTurkish[2] ? `${mName} ${mTurkish[2]}` : mName;
    }
  }

  return '';
}
