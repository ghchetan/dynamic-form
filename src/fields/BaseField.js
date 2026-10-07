import { el, button, setInputValue } from '../utils/dom.js';
import { isEmpty } from '../utils/format.js';
import { evaluateStatus, evaluateStatusRules } from '../evaluators/index.js';
import { FIELD_STATUS, FIELD_STATUS_LABELS } from '../constants.js';
import { renderAttachmentPicker } from './attachmentPicker.js';

/**
 * BaseField — the parent class of every field type.
 *
 * A field object knows three things:
 *   this.config   its settings from the JSON (name, label, type, evaluation, ...)
 *   this.form     the form it belongs to — read/write values with form.getValue() / form.setValue()
 *   this.context  where it sits on the page, e.g. { unit, section } for fields inside a unit tab
 *
 * Life cycle of a field:
 *   1. new SomeField(config, form, context)  → created once; its default value is stored on the form
 *   2. render()                              → builds the page elements once and returns them
 *   3. refresh()                             → runs after ANY value on the form changes; update the look here
 *
 * The field never keeps its own copy of the value. The value always lives in form.values,
 * so there is exactly one place to look when debugging.
 *
 * ➜ To create a new field type: extend this class and override only what is different
 *   (usually renderControl()). SelectField.js is a short example to copy from.
 */
export class BaseField {
    constructor(config, form, context = {}) {
        this.config = config;
        this.form = form;
        this.context = context;
        this.name = config.name;

        /** Subclasses set this to true to show a "Pass / Check / Flagged" chip next to the label. */
        this.showsStatusChip = false;

        // Page elements, filled in by render()
        this.element = null;    // outer wrapper: <div class="dfr-field">
        this.control = null;    // the main <input>, <select> or <textarea>, if the field has one
        this.statusChip = null;
        this.helpBox = null;
        this.attachmentPicker = null; // { element, refresh } when the config enables attachments
    }

    // ───────────────────────────── Values ─────────────────────────────

    /**
     * The value(s) this field puts on the form when it is created.
     * Returns an object because some fields store more than one value (see ToleranceField).
     */
    getDefaultValues() {
        if (!this.name) return {};
        return { [this.name]: this.config.defaultValue ?? '' };
    }

    /** The current value of this field. */
    get value() {
        return this.form.getValue(this.name);
    }

    /** Only CalculatedField does something here. It is called before refresh(). */
    recalculate() {}

    // ───────────────────────────── Status ─────────────────────────────

    /**
     * Tracked fields count towards progress ("3/7") and can show up as deficiencies.
     * A field is tracked when its config has an `evaluation` rule.
     */
    isTracked() {
        return Boolean(this.config.evaluation);
    }

    /** Has the user answered this field? */
    isComplete() {
        return !isEmpty(this.value);
    }

    /**
     * 'green' | 'yellow' | 'red' | 'gray'. The config decides how, in one of two ways:
     *   statusRules  a list of conditions, e.g. { "when": "value <= 0", "status": "pass" }
     *   evaluation   a named rule, e.g. { "type": "expectedValue", "expectedValue": "Yes" }
     *
     * Note: statusRules only COLOUR a field. Only `evaluation` makes a field tracked
     * (counted in progress and listed as a deficiency) — see isTracked().
     */
    getStatus() {
        if (isEmpty(this.value)) return FIELD_STATUS.NONE;
        if (this.config.statusRules) return evaluateStatusRules(this.config.statusRules, this.value, this.form.values);
        return evaluateStatus(this.config.evaluation, this.value);
    }

    /** True when this field needs attention (red or yellow). */
    isDeficient() {
        const status = this.getStatus();
        return status === FIELD_STATUS.FAIL || status === FIELD_STATUS.CAUTION;
    }

    /** Text for the status chip. The config can override the default words. */
    getStatusLabel(status) {
        return this.config.evaluation?.statuses?.[status] || FIELD_STATUS_LABELS[status];
    }

    // ───────────────────────────── Rendering ─────────────────────────────

    /**
     * Build the complete field: label row, help text, the input itself, and the photo picker.
     * Hidden fields keep their value but are not drawn.
     */
    render() {
        if (this.config.hidden) return null;

        this.element = el('div', {
            className: `dfr-field dfr-field-${this.config.type || 'text'}`,
            attrs: { id: this.config.id },
            dataset: { fieldName: this.name },
        }, [
            this.renderHeading(),
            this.renderHelp(),
            this.renderControl(),
            this.renderAttachments(),
        ]);

        this.element.style.gridColumn = `span ${this.getColumnSpan()}`;
        return this.element;
    }

    /**
     * How many grid columns this field takes, from `layout.columnSpan` on the field:
     *   (not set)  → 1
     *   2          → 2 columns
     *   "full"     → the whole row, however many columns the form has
     * Never more than the form's column count — a span of 2 in a 1-column form would
     * otherwise make the grid add an extra column and break the layout.
     */
    getColumnSpan() {
        const formColumns = this.form.layout.columns;
        const requested = this.config.layout?.columnSpan;

        if (requested === undefined || requested === null) return 1;
        if (requested === 'full') return formColumns;

        const span = Number(requested);
        if (!Number.isInteger(span) || span < 1) {
            console.warn(`DynamicFormRenderer: columnSpan "${requested}" on field "${this.name}" should be a whole number or "full". Using 1.`);
            return 1;
        }
        return Math.min(span, formColumns);
    }

    /** The row above the input: label, optional "?" help button, optional status chip. */
    renderHeading() {
        const label = el('label', {
            className: 'dfr-label',
            text: this.config.label || this.name,
            attrs: { for: this.labelTargetId() },
        });

        const helpButton = this.config.help?.text
            ? button('?', 'dfr-info-btn', () => this.toggleHelp())
            : null;
        if (helpButton) helpButton.setAttribute('aria-label', `Help for ${this.config.label}`);

        if (this.showsStatusChip) {
            this.statusChip = el('span', { className: 'dfr-chip dfr-gray', text: FIELD_STATUS_LABELS.gray });
        }

        return el('div', { className: 'dfr-field-head' }, [
            el('div', { className: 'dfr-field-label-wrap' }, [label, helpButton]),
            this.statusChip,
        ]);
    }

    /** The yellow help box. Hidden until the "?" button is clicked. */
    renderHelp() {
        if (!this.config.help?.text) return null;
        this.helpBox = el('div', { className: 'dfr-help', text: this.config.help.text, hidden: true });
        return this.helpBox;
    }

    /** The input itself. Every subclass must override this. */
    renderControl() {
        throw new Error(`${this.constructor.name} must implement renderControl().`);
    }

    /** "Attach photo" button + thumbnails, when the config enables attachments. */
    renderAttachments() {
        if (!this.config.attachments?.enabled) return null;
        this.attachmentPicker = renderAttachmentPicker(this);
        return this.attachmentPicker.element;
    }

    /**
     * The id the <label for="..."> points to.
     * Fields made of several inputs (segmented buttons, tolerance) return null.
     */
    labelTargetId() {
        return this.form.controlId(this.name);
    }

    /** Give an <input>, <select> or <textarea> the standard id, name, class and flags from the config. */
    applyStandardAttributes(control) {
        const { config } = this;
        control.id = this.form.controlId(this.name);
        control.name = this.name;
        control.className = 'dfr-control';
        if (config.placeholder) control.placeholder = config.placeholder;
        if (config.readOnly) control.readOnly = true;
        if (config.disabled) control.disabled = true;
        if (config.step !== undefined && config.step !== null) control.step = config.step;
    }

    // ───────────────────────────── Updating ─────────────────────────────

    /** Called after any value on the form changes. Subclasses call super.refresh() and then add their own updates. */
    refresh() {
        this.refreshStatusChip();
        this.syncControlValue();

        // Remove the red "required" outline as soon as the user fills the field in.
        if (!isEmpty(this.value)) this.control?.classList.remove('dfr-invalid');

        // Fields with statusRules (e.g. a calculated variance) colour their input instead of showing a chip.
        if (this.config.statusRules && this.control) this.control.dataset.status = this.getStatus();

        this.attachmentPicker?.refresh();
    }

    refreshStatusChip() {
        if (!this.statusChip) return;
        const status = this.getStatus();
        this.statusChip.className = `dfr-chip dfr-${status}`;
        this.statusChip.textContent = this.getStatusLabel(status);
    }

    /** Copy the value from form.values into the input (needed when data is pulled from CAPS, for example). */
    syncControlValue() {
        setInputValue(this.control, this.value);
    }

    /** Show the red outline used for "this field is required". */
    markInvalid() {
        this.control?.classList.add('dfr-invalid');
    }

    focus() {
        this.control?.focus();
    }

    toggleHelp() {
        if (this.helpBox) this.helpBox.hidden = !this.helpBox.hidden;
    }
}
