export const DEMO_PHONES = new Set([
  '05551234567',
  '05423010001',
  '05423010002',
  '05423010003',
  '05423010004',
  '05423010005',
  '05321010001',
  '05321010002',
  '05321010003',
  '05321010004',
  '05321010005',
  '05321010006',
  '05321010007',
  '05321010008',
  '05321010009',
]);

export function isDemoUser(user?: { phone?: string | null; email?: string | null } | null): boolean {
  if (!user) return false;
  if (user.phone) {
    const digits = user.phone.replace(/\D/g, '');
    const normalized = digits.length === 10 && digits.startsWith('5') ? `0${digits}` : digits;
    if (DEMO_PHONES.has(normalized)) {
      return true;
    }
  }
  if (user.email && user.email.toLowerCase() === 'yonetici@cinarpark.com') {
    return true;
  }
  return false;
}
