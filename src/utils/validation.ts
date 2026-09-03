export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim().toLowerCase());
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function isNonNegativeInteger(value: string): boolean {
  return /^\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value));
}

export function isPositiveNumber(value: string): boolean {
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed) && parsed > 0;
}

export function isNonNegativeNumber(value: string): boolean {
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed) && parsed >= 0;
}
