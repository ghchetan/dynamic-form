import { el } from '../utils/dom.js';
import { createField } from '../fields/index.js';

/**
 * Card section — a white box with a title and its fields in a 2-column grid.
 * This is the default section type (used when `type` is "card" or missing).
 *
 * Config example:
 *   { "type": "card", "title": "Project contacts", "fields": [ ... ] }
 *
 * @returns {{ element: HTMLElement }}  A card has nothing to refresh; its fields refresh themselves.
 */
export function renderCardSection(form, section, context = {}) {
    const fields = (section.fields || []).map(fieldConfig => createField(fieldConfig, form, context));

    const element = el('section', { className: 'dfr-card' }, [
        section.title ? el('h3', { className: 'dfr-card-title', text: section.title }) : null,
        el('div', { className: 'dfr-grid' }, fields.map(field => field.render())),
    ]);

    return { element };
}
