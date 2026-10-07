import { el } from '../utils/dom.js';
import { BaseField } from './BaseField.js';

/** Which HTML input type to use for each config type. */
const HTML_INPUT_TYPES = {
    text: 'text',
    email: 'email',
    number: 'number',
    date: 'date',
};

/**
 * InputField — a plain text box. Handles these config types:
 *   text, email, number, date  → <input>
 *   textarea                   → <textarea> (multi-line)
 *
 * If the config has a `unit` (e.g. "V"), the unit is shown inside the right edge of the box.
 */
export class InputField extends BaseField {
    renderControl() {
        const isTextArea = this.config.type === 'textarea';

        this.control = isTextArea
            ? el('textarea', { attrs: { rows: this.config.rows || 3 } })
            : el('input', { attrs: { type: HTML_INPUT_TYPES[this.config.type] || 'text' } });

        this.applyStandardAttributes(this.control);
        this.control.value = this.value ?? '';
        this.control.addEventListener('input', () => this.form.setValue(this.name, this.control.value));

        if (!this.config.unit) return this.control;

        return el('div', { className: 'dfr-input-with-unit' }, [
            this.control,
            el('span', { className: 'dfr-unit', text: this.config.unit }),
        ]);
    }
}
