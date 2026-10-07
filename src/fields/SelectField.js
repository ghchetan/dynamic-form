import { el } from '../utils/dom.js';
import { BaseField } from './BaseField.js';

/**
 * SelectField — a dropdown list.
 *
 * Config example:
 *   { "type": "select", "name": "u2WheelRotation", "label": "Wheel rotation",
 *     "options": [ { "label": "CW — matches order", "value": "match" }, ... ],
 *     "evaluation": { "type": "valueMap", "map": { "match": "green", "mismatch": "red" } } }
 *
 * With an `evaluation`, a "red" choice shows up in the deficiency list like any other flagged field.
 */
export class SelectField extends BaseField {
    renderControl() {
        this.control = el('select');
        this.applyStandardAttributes(this.control);

        // First, empty option so nothing is pre-selected.
        this.control.append(new Option(this.config.placeholder || 'Select...', ''));
        (this.config.options || []).forEach(option => {
            this.control.append(new Option(option.label, option.value));
        });

        this.control.value = this.value ?? '';
        this.control.addEventListener('change', () => this.form.setValue(this.name, this.control.value));
        return this.control;
    }
}
