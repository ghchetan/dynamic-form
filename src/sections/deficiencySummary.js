import { el, button } from '../utils/dom.js';

/**
 * Deficiency summary — the red/green box listing every field that is red or yellow,
 * with a "View" link that jumps to the field.
 *
 * Config example:
 *   { "type": "deficiencySummary", "title": "Deficiencies — review before submitting",
 *     "emptyTitle": "No deficiencies identified — clean so far", "defaultExpanded": true }
 */
export function renderDeficiencySummary(form, section) {
    const title = el('span');
    const count = el('strong');
    const body = el('div', { className: 'dfr-deficiency-body', hidden: section.defaultExpanded === false });

    const head = button('', 'dfr-deficiency-head', () => { body.hidden = !body.hidden; });
    head.append(title, count);

    const element = el('section', { className: 'dfr-deficiency' }, [head, body]);
    let lastShownList = null;

    function refresh() {
        const deficientFields = form.getDeficientFields();

        // Only rebuild the list when it really changed. The site timer refreshes the form every
        // second; rebuilding each time would swap the "View" buttons out from under the user's finger.
        const listSignature = deficientFields
            .map(field => `${field.name}:${field.getStatus()}:${form.getUnitMark(field.context.unit)}`)
            .join('|');
        if (listSignature === lastShownList) return;
        lastShownList = listSignature;

        const isClear = deficientFields.length === 0;
        element.classList.toggle('dfr-deficiency-clear', isClear);
        title.textContent = isClear
            ? section.emptyTitle || 'No deficiencies identified — clean so far'
            : section.title || 'Deficiencies — review before submitting';
        count.textContent = deficientFields.length;

        body.replaceChildren(...(isClear
            ? [el('div', { className: 'dfr-clean-message', text: 'Every completed field is within its acceptable range.' })]
            : deficientFields.map(field => renderDeficiencyRow(form, field))));
    }

    return { element, refresh };
}

/** One line in the list:  "Power to lights?  CP-1      [RED]  View" */
function renderDeficiencyRow(form, field) {
    const status = field.getStatus();

    return el('div', { className: 'dfr-def-item' }, [
        el('div', {}, [
            el('strong', { text: field.config.label || field.name }),
            el('span', { text: form.getUnitMark(field.context.unit) }),
        ]),
        el('span', { className: `dfr-def-tag dfr-${status}`, text: status.toUpperCase() }),
        button('View', 'dfr-link-btn', () => form.jumpToField(field)),
    ]);
}
