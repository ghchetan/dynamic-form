import { isEmpty } from '../utils/format.js';

/**
 * Workflow buttons — "Submit for review", "Approve", "Reject".
 * They move the report to a new status.
 *
 * Config example:
 *   { "type": "workflow", "label": "Reject — send back", "targetStatus": "rejected",
 *     "validation": { "requiredFields": ["reviewerNote"] } }
 *
 * Steps:
 *   1. Check required fields. If any are empty, outline them in red and stop.
 *   2. Change the report status (the header pill updates automatically).
 *   3. Tell the host page through the `onWorkflow` callback, so it can call the CRM
 *      (usually by calling form.submit()).
 *   4. If that callback fails, put the old status back, so the screen never shows
 *      "Review" for a report the CRM never received.
 *
 * The button is disabled while this runs, so a double-click cannot send the report twice.
 *
 * @returns {Promise<boolean>} true when the status was changed and the host page accepted it
 */
export async function runWorkflow(form, action, button) {
    const requiredNames = action.validation?.requiredFields || [];
    const missingNames = requiredNames.filter(name => isEmpty(form.getValue(name)));

    if (missingNames.length > 0) {
        missingNames.forEach(name => form.getField(name)?.markInvalid());
        form.getField(missingNames[0])?.focus();
        return false;
    }

    const previousStatus = form.getReportStatus();
    if (button) button.disabled = true;

    try {
        if (action.targetStatus) form.setReportStatus(action.targetStatus);
        await form.callbacks.onWorkflow?.(action, form.getData(), form);
        return true;
    } catch (error) {
        console.error(`DynamicFormRenderer: "${action.label}" failed, so the report status was put back.`, error);
        form.setReportStatus(previousStatus);
        return false;
    } finally {
        if (button) button.disabled = false;
    }
}
