import { InputField } from './InputField.js';
import { SelectField } from './SelectField.js';
import { CheckboxField } from './CheckboxField.js';
import { CalculatedField } from './CalculatedField.js';
import { SegmentedField } from './SegmentedField.js';
import { ToleranceField } from './ToleranceField.js';

/**
 * Field registry — maps the `type` written in the JSON to the class that draws it.
 *
 * ➜ To support a new field type (for example "signature"):
 *     1. Create SignatureField.js in this folder:  class SignatureField extends BaseField { ... }
 *     2. Add one line below:                         signature: SignatureField,
 *   Nothing else in the framework needs to change.
 */
export const FIELD_TYPES = {
    text: InputField,
    email: InputField,
    number: InputField,
    date: InputField,
    textarea: InputField,
    select: SelectField,
    checkbox: CheckboxField,
    calculated: CalculatedField,
    segmented: SegmentedField,
    tolerance: ToleranceField,
};

/**
 * Create the right field object for a field config and register it on the form.
 *
 * @param {object} config   One field from the JSON
 * @param {DynamicFormRenderer} form
 * @param {object} [context]  Where the field lives, e.g. { unit, section }
 * @returns {BaseField}
 */
export function createField(config, form, context = {}) {
    let FieldClass = FIELD_TYPES[config.type];

    if (!FieldClass) {
        if (config.type) {
            console.warn(`DynamicFormRenderer: unknown field type "${config.type}" (field "${config.name}"). Showing a text box instead.`);
        }
        FieldClass = InputField;
    }

    const field = new FieldClass(config, form, context);
    form.registerField(field);
    return field;
}
