import { FIELD_STATUS, GROUP_STATUS } from '../constants.js';

/**
 * Status roll-ups: turn a list of fields into "3/7 done" and "Red — deficiency found".
 *
 * These are plain functions with no page/DOM code, so they are easy to read and test.
 *
 * Only "tracked" fields count. A field is tracked when its config has an `evaluation`
 * block (see BaseField.isTracked).
 */

/**
 * Count how many tracked fields are done and whether any are red or yellow.
 * @returns {{ total: number, completed: number, hasFail: boolean, hasCaution: boolean }}
 */
export function summarizeFields(fields) {
    const trackedFields = fields.filter(field => field.isTracked());
    const statuses = trackedFields.map(field => field.getStatus());

    return {
        total: trackedFields.length,
        completed: trackedFields.filter(field => field.isComplete()).length,
        hasFail: statuses.includes(FIELD_STATUS.FAIL),
        hasCaution: statuses.includes(FIELD_STATUS.CAUTION),
    };
}

/** Colour of an accordion section's "3/7" chip. */
export function getSectionStatus(summary) {
    if (summary.hasFail) return GROUP_STATUS.FAIL;
    if (summary.hasCaution) return GROUP_STATUS.CAUTION;
    if (summary.total > 0 && summary.completed === summary.total) return GROUP_STATUS.PASS;
    return GROUP_STATUS.PENDING;
}

/**
 * Overall status of one unit (CP-1, EF-1, ...).
 *
 * @param {Array}   fields    All fields that belong to the unit
 * @param {boolean} hasNotes  True when the technician wrote unit notes (counts as "started")
 * @returns {{ status: string, label: string, started: boolean }}
 */
export function getUnitStatus(fields, hasNotes) {
    const summary = summarizeFields(fields);

    if (summary.hasFail) {
        return { status: GROUP_STATUS.FAIL, label: 'Red — deficiency found', started: true };
    }
    if (summary.hasCaution) {
        return { status: GROUP_STATUS.CAUTION, label: 'Yellow — needs a look', started: true };
    }

    const started = summary.completed > 0 || hasNotes;
    if (!started) {
        return { status: GROUP_STATUS.PENDING, label: 'Not started', started: false };
    }
    if (summary.completed < summary.total) {
        return { status: GROUP_STATUS.PENDING, label: 'In progress', started: true };
    }
    return { status: GROUP_STATUS.PASS, label: 'Green — no issues', started: true };
}

/** One sentence about deficiencies, used in emails ({deficiencyStatusText}). */
export function describeDeficiencies(count) {
    return count === 0
        ? 'No issues identified so far.'
        : `${count} item(s) flagged for follow-up — details in the full report.`;
}
