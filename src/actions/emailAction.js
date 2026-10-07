import { fillTemplate } from '../utils/template.js';
import { describeDeficiencies } from '../core/status.js';

/**
 * "Email" button — opens the user's email app with a pre-filled message.
 *
 * Config example:
 *   { "type": "email", "toField": "leadEmail", "ccField": "servicerEmail",
 *     "subjectTemplate": "Start-up status — {salesOrder}",
 *     "bodyTemplate": "Hi {leadName},\n\nCurrent status: {deficiencyStatusText}" }
 *
 * Templates can use any field name in {curly braces}, plus {deficiencyStatusText}.
 */
export function openEmailDraft(form, action) {
    const templateValues = {
        ...form.values,
        deficiencyStatusText: describeDeficiencies(form.getDeficientFields().length),
    };

    const to = action.toField ? form.getValue(action.toField) || '' : '';
    const cc = action.ccField ? form.getValue(action.ccField) || '' : '';
    const subject = fillTemplate(action.subjectTemplate, templateValues);
    const body = fillTemplate(action.bodyTemplate, templateValues)
        // The CRM may send line breaks as the two characters "\n"; turn them into real line breaks.
        .replace(/\\n/g, '\n');

    const query = [
        cc && `cc=${encodeURIComponent(cc)}`,
        `subject=${encodeURIComponent(subject)}`,
        `body=${encodeURIComponent(body)}`,
    ].filter(Boolean).join('&');

    window.location.href = `mailto:${encodeURIComponent(to)}?${query}`;
}
