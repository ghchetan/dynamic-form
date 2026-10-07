import { el } from '../utils/dom.js';
import { BaseField } from './BaseField.js';

/**
 * CheckboxField — a single tick box with its label on the right.
 * Used for checklist items such as "Check all fasteners, set screws, and locking collars".
 *
 * Value: true (ticked) or false.
 */
export class CheckboxField extends BaseField {
    getDefaultValues() {
        return { [this.name]: this.config.defaultValue ?? false };
    }

    isComplete() {
        return this.value === true;
    }

    /** No label row above the box — the label sits next to the box instead (see renderControl). */
    renderHeading() {
        return null;
    }

    renderControl() {
        this.control = el('input', { attrs: { type: 'checkbox' } });
        this.applyStandardAttributes(this.control);
        this.control.className = 'dfr-checkbox';
        this.control.checked = this.value === true;
        this.control.addEventListener('change', () => this.form.setValue(this.name, this.control.checked));

        // Wrapping the box in a <label> makes the text clickable too.
        return el('label', { className: 'dfr-checkbox-row' }, [
            this.control,
            el('span', { className: 'dfr-label', text: this.config.label || this.name }),
        ]);
    }

    syncControlValue() {
        if (this.control) this.control.checked = this.value === true;
    }
}
