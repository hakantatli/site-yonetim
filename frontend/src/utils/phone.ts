/**
 * Phone number formatting and masking utilities for Turkish phone numbers.
 * Target format: 0(5XX) XXX XXXX (e.g. 0(506) 658 8775)
 */

/**
 * Strips all non-digit characters from a phone number string.
 * Optionally ensures leading zero if 10 digits starting with 5 are provided.
 */
export function cleanPhone(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('5')) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Formats a phone string into 0(5XX) XXX XXXX for display.
 * If value doesn't match standard Turkish 10/11 digit format, returns sanitized or original.
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '-';
  let digits = value.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('5')) {
    digits = '0' + digits;
  }
  if (digits.length !== 11) {
    return value; // Return as-is if not valid 11 digits
  }

  const area = digits.slice(1, 4);
  const mid = digits.slice(4, 7);
  const rest = digits.slice(7, 11);

  return `0(${area}) ${mid} ${rest}`;
}

/**
 * Masks user input as they type into a text field.
 * Handles auto-prefixing '0' if user starts typing with '5'.
 * Returns formatted mask up to 0(5XX) XXX XXXX.
 */
export function maskPhoneInput(input: string): string {
  if (!input) return '';

  let digits = input.replace(/\D/g, '');

  // If user begins typing with '5' instead of '0', prepend '0'
  if (digits.length > 0 && !digits.startsWith('0')) {
    if (digits.startsWith('5')) {
      digits = '0' + digits;
    } else {
      // If starts with another number, prepend 0
      digits = '0' + digits;
    }
  }

  // Limit to 11 digits
  digits = digits.slice(0, 11);

  if (digits.length === 0) return '';
  if (digits.length === 1) return '0';
  if (digits.length <= 4) {
    return `0(${digits.slice(1)}`;
  }
  if (digits.length <= 7) {
    return `0(${digits.slice(1, 4)}) ${digits.slice(4)}`;
  }
  return `0(${digits.slice(1, 4)}) ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}
