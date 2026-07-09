/**
 * Formats a raw input string as an Indonesian Rupiah amount: strips
 * everything but digits, drops redundant leading zeros, then inserts a dot
 * every 3 digits from the right (e.g. "1500000" -> "1.500.000").
 */
export function formatRupiah(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");
  const normalized = digitsOnly.replace(/^0+(?=\d)/, "");
  if (!normalized) return "";
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Strips thousand-separator dots (or any non-digit) and returns the plain integer, 0 if empty. */
export function parseRupiah(value: string): number {
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

/** Counts digit characters in `value` before `caretPosition` — dots don't count. */
export function countDigitsBefore(value: string, caretPosition: number): number {
  let count = 0;
  for (let i = 0; i < caretPosition && i < value.length; i++) {
    if (/\d/.test(value[i])) count++;
  }
  return count;
}

/** Finds the character index in `formatted` right after the `digitCount`-th digit. */
export function caretPositionForDigitCount(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

/**
 * Reformats a raw input edit and computes where the caret should land so it
 * stays anchored to the same digit (not raw character index) — inserting or
 * removing a dot elsewhere in the string must not make the caret jump.
 */
export function formatKeystroke(rawValue: string, caretPosition: number): { formatted: string; caret: number } {
  const digitsBeforeCaret = countDigitsBefore(rawValue, caretPosition);
  const formatted = formatRupiah(rawValue);
  return { formatted, caret: caretPositionForDigitCount(formatted, digitsBeforeCaret) };
}
