import { el, button } from '../utils/dom.js';
import { summarizeFields, getSectionStatus } from '../core/status.js';
import { createField } from '../fields/index.js';

/**
 * Accordion — a collapsible section inside a unit tab, e.g. "Control Panel   3/7 ▸".
 * The "3/7" chip shows how many tracked fields are answered and turns red/yellow/green.
 *
 * Config example:
 *   { "id": "u4Panel", "title": "Control Panel", "subtitle": "(optional grey note)",
 *     "defaultExpanded": true, "fields": [ ... ] }
 *
 * @param {object} section  The section config
 * @param {object} unit     The unit this section belongs to
 * @returns {{ element: HTMLElement, refresh: Function }}
 */
export function renderAccordion(form, section, unit) {
    const body = el('div', { className: 'dfr-accordion-body' });
    const progressChip = el('span', { className: 'dfr-section-chip dfr-pending', text: '0/0' });

    const head = button('', 'dfr-accordion-head', () => setOpen(body.hidden));
    head.append(
        el('span', {}, [
            section.title,
            section.subtitle ? el('span', { className: 'dfr-formula-note', text: ` ${section.subtitle}` }) : null,
        ]),
        el('span', { className: 'dfr-accordion-meta' }, [
            progressChip,
            el('span', { className: 'dfr-chevron', text: '▸' }),
        ]),
    );

    function setOpen(isOpen) {
        body.hidden = !isOpen;
        head.classList.toggle('is-open', isOpen);
        head.setAttribute('aria-expanded', String(isOpen));
    }

    // Each field remembers its unit and section, so "View" in the deficiency list can open this section.
    const context = { unit, section: { id: section.id, open: () => setOpen(true) } };
    const fields = (section.fields || []).map(fieldConfig => createField(fieldConfig, form, context));
    body.append(...fields.map(field => field.render()).filter(Boolean));

    setOpen(section.defaultExpanded === true);

    function refresh() {
        const summary = summarizeFields(fields);
        progressChip.textContent = `${summary.completed}/${summary.total}`;
        progressChip.className = `dfr-section-chip dfr-${getSectionStatus(summary)}`;
    }

    const element = el('section', { className: 'dfr-accordion', dataset: { sectionId: section.id } }, [head, body]);
    return { element, refresh };
}
