import { el, button } from '../utils/dom.js';
import { FIELD_STATUS } from '../constants.js';
import { BaseField } from './BaseField.js';

/**
 * SegmentedField — a row of buttons where exactly one can be chosen, e.g.  [ Yes | No | N/A ].
 *
 * Config example:
 *   { "type": "segmented", "name": "u4ControlPower", "label": "Power to control panel?",
 *     "options": [ { "label": "Yes", "value": "Yes" }, { "label": "No", "value": "No" }, { "label": "N/A", "value": "N/A" } ],
 *     "evaluation": { "type": "expectedValue", "expectedValue": "Yes" } }
 *
 * The chosen button turns green when the answer passes and red when it fails.
 */
export class SegmentedField extends BaseField {
    constructor(config, form, context) {
        super(config, form, context);
        this.showsStatusChip = true;
        this.optionButtons = [];
    }

    /** There is no single input for the <label> to point to. */
    labelTargetId() {
        return null;
    }

    renderControl() {
        this.optionButtons = (this.config.options || []).map(option => {
            const optionButton = button(option.label, 'dfr-seg-btn', () => this.form.setValue(this.name, option.value));
            optionButton.dataset.value = option.value;
            return optionButton;
        });

        return el('div', {
            className: 'dfr-segmented',
            attrs: { role: 'group', 'aria-label': this.config.label },
        }, this.optionButtons);
    }

    /** "N/A" is a valid answer but has no pass/fail colour, so show "N/A" in the chip instead of "—". */
    getStatusLabel(status) {
        if (status === FIELD_STATUS.NONE && this.value === 'N/A') return 'N/A';
        return super.getStatusLabel(status);
    }

    refresh() {
        super.refresh();

        const status = this.getStatus();
        this.optionButtons.forEach(optionButton => {
            const isSelected = optionButton.dataset.value === String(this.value);
            optionButton.classList.toggle('is-active', isSelected);
            optionButton.classList.toggle('is-good', isSelected && status === FIELD_STATUS.PASS);
            optionButton.classList.toggle('is-bad', isSelected && status === FIELD_STATUS.FAIL);
            optionButton.setAttribute('aria-pressed', String(isSelected));
        });
    }
}
