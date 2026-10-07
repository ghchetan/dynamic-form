/**
 * Safe maths for the config. Two kinds of text are supported:
 *
 *   Formulas    "{actualHours} - {expectedHours}"          → a number    (evaluateFormula)
 *   Conditions  "value > 0 && value <= expectedHours * 0.25" → true/false  (evaluateCondition)
 *
 * Both work the same way:
 *   1. Replace every field name with that field's number (empty or invalid → 0).
 *   2. Check that only digits, spaces and operators are left:  + - * / ( ) . < > = ! & |
 *      This check is what makes step 3 safe: with no letters left, no code can be injected.
 *   3. Let JavaScript work out the result.
 */

const ONLY_NUMBERS_AND_OPERATORS = /^[0-9+\-*/().\s<>=!&|]+$/;

/**
 * Work out a formula where field names are written in {curly braces}.
 *
 * @example
 *   evaluateFormula('{actualHours} - {expectedHours}', { actualHours: 5, expectedHours: 4.5 })  → 0.5
 *
 * @returns {number} The result, or 0 if the formula is invalid.
 */
export function evaluateFormula(formula, values) {
    const expression = String(formula || '').replace(/\{([^}]+)\}/g, (placeholder, name) => toSafeNumber(values[name.trim()]));
    const result = runExpression(expression, formula);
    return Number.isFinite(result) ? result : 0;
}

/**
 * Check a condition where field names are written as plain words.
 *
 * @example
 *   evaluateCondition('value > expectedHours * 0.25', { value: 2, expectedHours: 4.5 })  → true
 *
 * @returns {boolean} true only when the condition is valid and true.
 */
export function evaluateCondition(condition, variables) {
    const expression = String(condition || '').replace(/[A-Za-z_$][\w$]*/g, name => toSafeNumber(variables[name]));
    return runExpression(expression, condition) === true;
}

/** A value as a number in brackets, ready to drop into an expression. Not a number → '0'. */
function toSafeNumber(value) {
    const number = parseFloat(value);
    // toFixed() avoids scientific notation like "1e-7", which would fail the safety check.
    return Number.isFinite(number) ? `(${number.toFixed(10)})` : '0';
}

/** Steps 2 and 3: check the characters, then calculate. Returns undefined when anything is wrong. */
function runExpression(expression, originalText) {
    if (!ONLY_NUMBERS_AND_OPERATORS.test(expression)) {
        console.warn(`DynamicFormRenderer: "${originalText}" contains unsupported characters.`);
        return undefined;
    }

    try {
        return Function(`"use strict"; return (${expression});`)();
    } catch {
        console.warn(`DynamicFormRenderer: "${originalText}" is not a valid expression.`);
        return undefined;
    }
}
