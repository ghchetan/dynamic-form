/**
 * Shared constants used across the form framework.
 *
 * Keeping these words in one place means a typo becomes `undefined` (easy to spot)
 * instead of a silent bug like comparing against 'gren'.
 */

/**
 * The result of evaluating ONE field.
 * The value is also used as a CSS class suffix, e.g. "dfr-green", "dfr-red".
 */
export const FIELD_STATUS = Object.freeze({
    PASS: 'green',
    CAUTION: 'yellow',
    FAIL: 'red',
    NONE: 'gray', // not answered yet, or nothing to judge (e.g. "N/A")
});

/** Default text shown in a field's status chip. A field's config can override it with `evaluation.statuses`. */
export const FIELD_STATUS_LABELS = Object.freeze({
    green: 'Pass',
    yellow: 'Check',
    red: 'Flagged',
    gray: '—',
});

/**
 * The roll-up status of a GROUP of fields (one accordion section, or a whole unit).
 * Also used as a CSS class suffix, e.g. "dfr-pass", "dfr-dot-fail".
 */
export const GROUP_STATUS = Object.freeze({
    PASS: 'pass',
    CAUTION: 'caution',
    FAIL: 'fail',
    PENDING: 'pending',
});

/**
 * statusRules in the config may use either set of words ("pass" or "green").
 * This turns both into a FIELD_STATUS value.
 */
export const STATUS_WORD_TO_FIELD_STATUS = Object.freeze({
    pass: 'green',
    caution: 'yellow',
    fail: 'red',
    pending: 'gray',
    green: 'green',
    yellow: 'yellow',
    red: 'red',
    gray: 'gray',
});

/** Id used for the "Summary" tab that sits next to the unit tabs. */
export const SUMMARY_TAB_ID = 'summary';

/** Name of the value that holds the report status (draft / review / approved / rejected) when the config does not name one. */
export const DEFAULT_STATUS_FIELD = 'reportStatus';
