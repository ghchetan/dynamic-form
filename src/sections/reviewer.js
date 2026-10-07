import { el, button } from '../utils/dom.js';
import { createField } from '../fields/index.js';

const SHOW_REVIEWER_TEXT = 'Switch to reviewer view →';
const SHOW_TECHNICIAN_TEXT = '← Back to technician view';

/**
 * Reviewer card — for the person the report is routed to next.
 * A toggle button shows a card with a note field and Approve / Reject buttons.
 *
 * Config example:
 *   { "enabled": true, "title": "Reviewer actions",
 *     "fields":  [ { "name": "reviewerNote", "type": "textarea", ... } ],
 *     "actions": [ { "type": "workflow", "label": "Reject — send back", "targetStatus": "rejected",
 *                    "validation": { "requiredFields": ["reviewerNote"] } },
 *                  { "type": "workflow", "label": "Approve — forward", "targetStatus": "approved" } ] }
 *
 * @returns {{ element: HTMLElement } | null}
 */
export function renderReviewer(form) {
    const config = form.config.reviewer;
    if (!config?.enabled) return null;

    const fields = (config.fields || []).map(fieldConfig => createField(fieldConfig, form, { area: 'reviewer' }));
    const decisionBanner = el('div', { className: 'dfr-decision-banner' });

    const actionButtons = (config.actions || []).map(action => {
        const style = action.targetStatus === 'rejected' ? 'dfr-btn dfr-btn-danger' : 'dfr-btn dfr-btn-success';
        const actionButton = button(action.label, style);

        actionButton.addEventListener('click', async () => {
            const succeeded = await form.runAction(action, actionButton);
            if (succeeded) showDecision(form, fields[0], decisionBanner);
        });
        return actionButton;
    });

    const card = el('section', { className: 'dfr-card dfr-reviewer-card', hidden: true }, [
        el('h3', { className: 'dfr-card-title', text: config.title || 'Reviewer actions' }),
        config.description ? el('p', { className: 'dfr-smallnote', text: config.description }) : null,
        ...fields.map(field => field.render()),
        el('div', { className: 'dfr-reviewer-actions' }, actionButtons),
        decisionBanner,
    ]);

    const toggle = button(SHOW_REVIEWER_TEXT, 'dfr-reviewer-toggle', () => {
        card.hidden = !card.hidden;
        toggle.textContent = card.hidden ? SHOW_REVIEWER_TEXT : SHOW_TECHNICIAN_TEXT;
    });

    return { element: el('div', { className: 'dfr-reviewer' }, [toggle, card]) };
}

/** Show the green "Approved" or red "Sent back" message after a decision. */
function showDecision(form, noteField, banner) {
    const status = form.getReportStatus();
    const note = noteField ? noteField.value || '' : '';

    banner.className = `dfr-decision-banner dfr-decision-${status}`;
    banner.textContent = status === 'rejected'
        ? `Sent back to vendor — “${note}”`
        : 'Approved — forwarded to next stakeholder.';
}
