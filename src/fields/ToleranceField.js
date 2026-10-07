import { el, setInputValue } from '../utils/dom.js';
import { toNumber } from '../utils/format.js';
import { evaluateStatus, percentDeviation } from '../evaluators/index.js';
import { FIELD_STATUS } from '../constants.js';
import { BaseField } from './BaseField.js';

/** The coloured bar shows deviations from -20% (left edge) to +20% (right edge). */
const BAR_RANGE_PERCENT = 20;

/**
 * ToleranceField — compares a measured READING against a REFERENCE value.
 *
 * Example: "EF Fan 1 overload setting"
 *   reference = Nameplate FLA    18.2 A
 *   reading   = Overload setting 19.0 A   → +4.4% deviation → green / yellow / red
 *
 * Config example:
 *   { "type": "tolerance", "name": "u4Overload", "unit": "A",
 *     "reference": { "name": "u4OverloadReference", "label": "Nameplate FLA" },
 *     "reading":   { "name": "u4OverloadReading",   "label": "Overload setting" },
 *     "evaluation": { "type": "percentTolerance", "greenPercent": 5, "redPercent": 15 } }
 *
 * Unlike other fields, this one stores TWO values on the form: reference.name and reading.name.
 */
export class ToleranceField extends BaseField {
    constructor(config, form, context) {
        super(config, form, context);
        this.showsStatusChip = true;

        // Page elements, filled in by renderControl()
        this.referenceInput = null;
        this.readingInput = null;
        this.bar = null;
        this.marker = null;
        this.readout = null;
    }

    getDefaultValues() {
        const { reference, reading } = this.config;
        return {
            [reference.name]: reference.defaultValue ?? '',
            [reading.name]: reading.defaultValue ?? '',
        };
    }

    /** Both values as numbers. An empty input gives NaN. */
    getNumbers() {
        return {
            reference: toNumber(this.form.getValue(this.config.reference.name)),
            reading: toNumber(this.form.getValue(this.config.reading.name)),
        };
    }

    isComplete() {
        const { reference, reading } = this.getNumbers();
        return Number.isFinite(reference) && Number.isFinite(reading);
    }

    /** We can only judge the reading when both numbers exist (and, for percentages, the reference is not 0). */
    canEvaluate() {
        if (!this.isComplete()) return false;
        const isPercentRule = this.config.evaluation?.type === 'percentTolerance';
        return !(isPercentRule && this.getNumbers().reference === 0);
    }

    getStatus() {
        if (!this.canEvaluate()) return FIELD_STATUS.NONE;
        return evaluateStatus(this.config.evaluation, this.getNumbers());
    }

    /** There is no single input for the <label> to point to. */
    labelTargetId() {
        return null;
    }

    renderControl() {
        const referencePart = this.renderNumberInput(this.config.reference);
        const readingPart = this.renderNumberInput(this.config.reading);
        this.referenceInput = referencePart.input;
        this.readingInput = readingPart.input;

        this.marker = el('div', { className: 'dfr-tolerance-marker' });
        this.bar = el('div', { className: 'dfr-tolerance-bar' }, [this.marker]);
        this.readout = el('div', { className: 'dfr-tolerance-readout' });

        return el('div', { className: 'dfr-tolerance' }, [
            el('div', { className: 'dfr-tolerance-inputs' }, [referencePart.wrapper, readingPart.wrapper]),
            this.bar,
            this.readout,
        ]);
    }

    /** One small labelled number box (used twice: reference and reading). */
    renderNumberInput(part) {
        const input = el('input', {
            className: 'dfr-control',
            attrs: {
                type: 'number',
                id: this.form.controlId(part.name),
                name: part.name,
                placeholder: part.placeholder,
                step: part.step,
            },
        });
        input.value = this.form.getValue(part.name) ?? '';
        input.addEventListener('input', () => this.form.setValue(part.name, input.value));

        const wrapper = el('div', { className: 'dfr-tolerance-input' }, [
            el('label', { className: 'dfr-mini-label', text: part.label || '', attrs: { for: input.id } }),
            el('div', { className: 'dfr-input-with-unit' }, [
                input,
                this.config.unit ? el('span', { className: 'dfr-unit', text: this.config.unit }) : null,
            ]),
        ]);
        return { wrapper, input };
    }

    refresh() {
        super.refresh();
        setInputValue(this.referenceInput, this.form.getValue(this.config.reference.name));
        setInputValue(this.readingInput, this.form.getValue(this.config.reading.name));

        if (!this.canEvaluate()) {
            this.showResult({ status: 'pending', deviation: 0, text: 'Enter both values to calculate.' });
            return;
        }

        const { reference, reading } = this.getNumbers();
        const status = this.getStatus();
        const deviation = percentDeviation(reference, reading);

        const text = this.config.evaluation?.type === 'exactMatch'
            ? `${reading} vs. ${reference} — ${status === FIELD_STATUS.PASS ? 'match' : 'does not match'}`
            : `Reading ${reading} vs. reference ${reference} → ${deviation >= 0 ? '+' : ''}${deviation.toFixed(1)}% deviation`;

        this.showResult({ status, deviation, text });
    }

    /** Update the bar colour, move the marker, and write the explanation text. */
    showResult({ status, deviation, text }) {
        this.bar.className = `dfr-tolerance-bar dfr-tolerance-${status}`;
        this.readout.textContent = text;

        // Map -20%..+20% onto 0%..100% of the bar width, and keep the marker inside the bar.
        const position = ((deviation + BAR_RANGE_PERCENT) / (BAR_RANGE_PERCENT * 2)) * 100;
        this.marker.style.left = `${Math.max(0, Math.min(100, position))}%`;
    }
}
