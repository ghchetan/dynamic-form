import { el } from '../utils/dom.js';
import { formatNumber } from '../utils/format.js';
import { createField } from '../fields/index.js';
import { createActionButton } from '../actions/index.js';

/**
 * Hours tracker — "Time on site": big numbers (Expected / Actual / Variance) and buttons
 * like "Start timer" and "Notify project lead".
 *
 * Config example:
 *   { "type": "hoursTracker", "title": "Time on site",
 *     "fields":  [ { "name": "expectedHours", ... }, { "name": "hoursVariance", "type": "calculated", ... } ],
 *     "actions": [ { "type": "timer", "targetField": "actualHours" }, { "type": "email", ... } ] }
 *
 * The fields are shown as read-only numbers, not as inputs.
 */
export function renderHoursTracker(form, section) {
    const fields = (section.fields || []).map(fieldConfig => createField(fieldConfig, form));

    const cells = fields.map(field => {
        const valueElement = el('div', { className: 'dfr-hours-value dfr-tnum' });
        const cellElement = el('div', { className: 'dfr-hours-cell' }, [
            valueElement,
            el('div', { className: 'dfr-hours-label', text: field.config.label }),
        ]);
        return { field, cellElement, valueElement };
    });

    const actionButtons = (section.actions || []).map(action => createActionButton(
        form,
        action,
        action.type === 'timer' ? 'dfr-btn dfr-btn-primary' : 'dfr-btn',
    ));

    const element = el('section', { className: 'dfr-card' }, [
        el('h3', { className: 'dfr-card-title', text: section.title || 'Time on site' }),
        el('div', { className: 'dfr-hours-grid' }, cells.map(cell => cell.cellElement)),
        actionButtons.length ? el('div', { className: 'dfr-inline-actions' }, actionButtons) : null,
    ]);

    function refresh() {
        cells.forEach(({ field, cellElement, valueElement }) => {
            valueElement.textContent = formatNumber(field.value, field.config.format || '0.00') || '—';

            // e.g. Variance turns green / amber / red through its statusRules (see CSS: .dfr-hours-cell[data-status]).
            if (field.config.statusRules) cellElement.dataset.status = field.getStatus();
        });
    }

    return { element, refresh };
}
