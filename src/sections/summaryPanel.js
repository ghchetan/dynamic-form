import { el } from '../utils/dom.js';
import { SUMMARY_TAB_ID } from '../constants.js';
import { renderSection } from './index.js';

/**
 * Summary panel — the content of `config.summary` (equipment status, narrative, signature).
 * Normally shown as the "Summary" tab next to the unit tabs.
 *
 * @returns {{ element: HTMLElement } | null}
 */
export function renderSummaryPanel(form) {
    const summary = form.config.summary;
    if (!summary) return null;

    const sectionElements = (summary.sections || []).map(section => form.addWidget(renderSection(form, section)));

    const element = el('section', {
        className: 'dfr-unit-panel',
        dataset: { unitPanel: SUMMARY_TAB_ID },
    }, sectionElements);

    return { element };
}
