import { el } from '../utils/dom.js';
import { formatNumber } from '../utils/format.js';
import { evaluateFormula } from '../utils/formula.js';
import { BaseField } from './BaseField.js';

/**
 * CalculatedField — a read-only number worked out from other fields.
 *
 * Config example:
 *   { "type": "calculated", "name": "hoursVariance",
 *     "formula": "{actualHours} - {expectedHours}", "format": "0.00" }
 */
export class CalculatedField extends BaseField {
    /**
     * Work out the new value. The form calls this before refresh().
     *
     * We write straight into form.values instead of calling form.setValue():
     * setValue() triggers a refresh, the refresh would call recalculate() again,
     * and we would be stuck in an endless loop.
     */
    recalculate() {
        this.form.values[this.name] = evaluateFormula(this.config.formula, this.form.values);
    }

    renderControl() {
        this.control = el('input', { attrs: { type: 'text' } });
        this.applyStandardAttributes(this.control);
        this.control.readOnly = true;
        return this.control;
    }

    /** Show the number using the format from the config, e.g. "0.00". */
    syncControlValue() {
        if (this.control) this.control.value = formatNumber(this.value, this.config.format);
    }
}
