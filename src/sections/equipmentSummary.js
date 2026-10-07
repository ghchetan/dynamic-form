import { el } from '../utils/dom.js';

/**
 * Equipment status summary — one row per unit with its overall status, the fields that are
 * flagged, and the technician's notes. Shown on the Summary tab.
 *
 * Config example:
 *   { "type": "equipmentStatusSummary", "title": "Equipment status — this visit" }
 */
export function renderEquipmentSummary(form, section) {
    const list = el('div', { className: 'dfr-equipment-summary' });
    let lastShownSummary = null;

    const element = el('section', { className: 'dfr-card' }, [
        el('h3', { className: 'dfr-card-title', text: section.title }),
        list,
    ]);

    function refresh() {
        const rows = form.getUnits().map(unit => ({
            unit,
            mark: form.getUnitMark(unit),
            status: form.getUnitStatus(unit),
            flaggedFields: form.getFieldsOfUnit(unit).filter(field => field.isTracked() && field.isDeficient()),
            notes: unit.notes ? form.getValue(unit.notes.name) : '',
        }));

        // Skip rebuilding when nothing visible changed (the site timer refreshes every second).
        const summarySignature = JSON.stringify(rows.map(row => [
            row.mark, row.status.label, row.notes, row.flaggedFields.map(field => `${field.name}:${field.getStatus()}`),
        ]));
        if (summarySignature === lastShownSummary) return;
        lastShownSummary = summarySignature;

        list.replaceChildren(...rows.map(renderUnitRow));
    }

    return { element, refresh };
}

/** One unit:  "EF-1   [Red — deficiency found]"  followed by its flagged fields and notes. */
function renderUnitRow({ mark, status, flaggedFields, notes }) {
    const details = flaggedFields.length
        ? el('div', { className: 'dfr-summary-details' }, [
            ...flaggedFields.map(field => el('div', {
                className: 'dfr-summary-flag',
                text: `${field.config.label || field.name} — ${field.getStatus().toUpperCase()}`,
            })),
            notes ? el('p', { className: 'dfr-smallnote', text: `Technician commentary: ${notes}` }) : null,
        ])
        : null;

    return el('div', { className: 'dfr-summary-unit' }, [
        el('div', { className: 'dfr-summary-unit-head' }, [
            el('strong', { text: mark }),
            el('span', { className: `dfr-section-chip dfr-${status.status}`, text: status.label }),
        ]),
        details,
    ]);
}
