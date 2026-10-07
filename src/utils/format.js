/**
 * Helpers for checking and formatting values.
 */

/** True when a value counts as "not filled in" (undefined, null, or only spaces). */
export function isEmpty(value) {
    return value === undefined || value === null || String(value).trim() === '';
}

/**
 * Turn a form value into a number.
 * Empty values become NaN (not 0), so "nothing entered" is never mistaken for zero.
 */
export function toNumber(value) {
    return isEmpty(value) ? NaN : Number(value);
}

/**
 * Format a number with a simple pattern.
 *   formatNumber(1.5, '0.00')  → '1.50'   (2 decimals)
 *   formatNumber(1.5, '0')     → '2'      (no decimals)
 *   formatNumber(1.5)          → '1.5'    (as is)
 * Returns '' when the value is not a number.
 */
export function formatNumber(value, pattern = '') {
    const number = toNumber(value);
    if (!Number.isFinite(number)) return '';
    if (!pattern) return String(number);

    const decimals = pattern.includes('.') ? pattern.split('.')[1].length : 0;
    return number.toFixed(decimals);
}

/** 'photo' → 'photos' when count is not 1. */
export function pluralize(count, word) {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}
