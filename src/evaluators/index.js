import { FIELD_STATUS, STATUS_WORD_TO_FIELD_STATUS } from '../constants.js';
import { evaluateCondition } from '../utils/formula.js';

/**
 * Evaluators decide whether a field's answer is OK.
 *
 * In the JSON, a field can have an `evaluation` block, for example:
 *   "evaluation": { "type": "expectedValue", "expectedValue": "Yes" }
 *
 * The `type` picks one of the functions below. Every evaluator has the same shape:
 *   (rule, input) => FIELD_STATUS   ('green' | 'yellow' | 'red' | 'gray')
 *     rule   the `evaluation` object from the JSON
 *     input  the field's current answer (a ToleranceField passes { reference, reading })
 *
 * ➜ To add a new rule type: add one function to EVALUATORS. Nothing else needs to change.
 */
export const EVALUATORS = {
    /** Pass when the answer equals the expected value, e.g. "Power to control panel?" must be "Yes". */
    expectedValue(rule, value) {
        if (value === 'N/A') return rule.notApplicableStatus || FIELD_STATUS.NONE;
        return value === rule.expectedValue
            ? rule.passStatus || FIELD_STATUS.PASS
            : rule.failStatus || FIELD_STATUS.FAIL;
    },

    /** Look the answer up in a map, e.g. { "match": "green", "mismatch": "red" }. */
    valueMap(rule, value) {
        return rule.map?.[value] || FIELD_STATUS.NONE;
    },

    /** Checklist checkbox: never pass/fail, it only counts towards progress. */
    checkedIsComplete() {
        return FIELD_STATUS.NONE;
    },

    /** The reading must equal the reference exactly, e.g. number of sensors wired = number of hood sections. */
    exactMatch(rule, { reference, reading }) {
        return reading === reference ? FIELD_STATUS.PASS : FIELD_STATUS.FAIL;
    },

    /**
     * The reading may differ from the reference by a percentage.
     *   within greenPercent → green
     *   within redPercent   → yellow
     *   beyond redPercent   → red
     */
    percentTolerance(rule, { reference, reading }) {
        const deviation = Math.abs(percentDeviation(reference, reading));
        const greenLimit = Number(rule.greenPercent ?? 0);
        const redLimit = Number(rule.redPercent ?? greenLimit);

        if (deviation <= greenLimit) return FIELD_STATUS.PASS;
        if (deviation <= redLimit) return FIELD_STATUS.CAUTION;
        return FIELD_STATUS.FAIL;
    },
};

/**
 * Run the evaluator named in `rule.type`.
 * Returns 'gray' when there is no rule or the rule type is unknown.
 */
export function evaluateStatus(rule, input) {
    if (!rule) return FIELD_STATUS.NONE;

    const evaluator = EVALUATORS[rule.type];
    if (!evaluator) {
        console.warn(`DynamicFormRenderer: unknown evaluation type "${rule.type}".`);
        return FIELD_STATUS.NONE;
    }
    return evaluator(rule, input);
}

/**
 * Status rules — a list of conditions. The FIRST rule whose `when` is true decides the status.
 *
 * Config example (on the "Variance" field):
 *   "statusRules": [
 *     { "when": "value <= 0",                                  "status": "pass" },
 *     { "when": "value > 0 && value <= expectedHours * 0.25", "status": "caution" },
 *     { "when": "value > expectedHours * 0.25",               "status": "fail" }
 *   ]
 *
 * Inside `when`, the word `value` means this field's value; any other word is the value of
 * the field with that name (here: expectedHours).
 *
 * @returns {string} FIELD_STATUS ('gray' when no rule matches)
 */
export function evaluateStatusRules(rules, value, formValues) {
    const variables = { ...formValues, value };
    const matchingRule = rules.find(rule => evaluateCondition(rule.when, variables));
    if (!matchingRule) return FIELD_STATUS.NONE;

    const status = STATUS_WORD_TO_FIELD_STATUS[matchingRule.status];
    if (!status) console.warn(`DynamicFormRenderer: unknown status "${matchingRule.status}" in statusRules.`);
    return status || FIELD_STATUS.NONE;
}

/** How far `reading` is from `reference`, in percent. 19 vs 20 → -5. */
export function percentDeviation(reference, reading) {
    if (reference === 0) return 0;
    return ((reading - reference) / reference) * 100;
}
