import { el, button } from '../utils/dom.js';
import { SUMMARY_TAB_ID } from '../constants.js';
import { createField } from '../fields/index.js';
import { createActionButton } from '../actions/index.js';
import { renderAccordion } from './accordion.js';
import { renderSummaryPanel } from './summaryPanel.js';

/**
 * Units — the tab strip and one panel per piece of equipment.
 *
 *   [ CP-1 • ] [ HD-1 ] [ EF-1 ] [ MUA-1 ] [ Summary ] [ + Add unit ]
 *
 * Each unit panel contains, from top to bottom:
 *   1. an identity card    (model, serial, mark name + "Pull from CAPS" button)
 *   2. one accordion per entry in unit.sections
 *   3. a notes card
 *
 * The coloured dot on each tab shows the unit's status (red / yellow / green).
 *
 * @returns {{ element, refresh, showUnit, hasSummaryTab } | null}  null when the config has no units
 */
export function renderUnits(form) {
    const unitsConfig = form.config.units;
    const units = unitsConfig?.items || [];
    if (units.length === 0) return null;

    const tabs = new Map();      // unitId → tab button
    const panels = new Map();    // unitId → panel element
    const tabParts = new Map();  // unitId → { label, dot } (the parts of a tab that change)

    units.forEach(unit => {
        const label = el('span', { text: unit.tabLabel || unit.id });
        const dot = el('span', { className: 'dfr-flagdot' });
        const tab = button('', 'dfr-unit-tab', () => showUnit(unit.id));
        tab.append(label, dot);

        tabs.set(unit.id, tab);
        tabParts.set(unit.id, { label, dot });
        panels.set(unit.id, renderUnitPanel(form, unit));
    });

    const summaryPanel = unitsConfig.summaryTab?.enabled ? renderSummaryPanel(form) : null;
    if (summaryPanel) {
        const summaryLabel = unitsConfig.summaryTab.label || 'Summary';
        tabs.set(SUMMARY_TAB_ID, button(summaryLabel, 'dfr-unit-tab dfr-unit-tab-summary', () => showUnit(SUMMARY_TAB_ID)));
        panels.set(SUMMARY_TAB_ID, summaryPanel.element);
    }

    // "+ Add unit" is handled by the host page (through the onAction callback).
    const addUnitButton = unitsConfig.allowAdd
        ? button(unitsConfig.addLabel || '+ Add unit', 'dfr-unit-add', () => form.emitAction({ id: 'addUnit', type: 'addUnit' }))
        : null;

    const element = el('div', { className: 'dfr-units' }, [
        el('div', { className: 'dfr-unit-tabs' }, [...tabs.values(), addUnitButton]),
        ...panels.values(),
    ]);

    /** Show one panel and highlight its tab. */
    function showUnit(unitId) {
        panels.forEach((panel, id) => { panel.hidden = id !== unitId; });
        tabs.forEach((tab, id) => tab.classList.toggle('is-active', id === unitId));
    }

    /** Update each tab's text (the mark name can be edited) and status dot. */
    function refresh() {
        units.forEach(unit => {
            const { label, dot } = tabParts.get(unit.id);
            label.textContent = form.getUnitMark(unit);
            dot.className = `dfr-flagdot dfr-dot-${form.getUnitStatus(unit).status}`;
        });
    }

    const firstUnit = units.find(unit => unit.defaultActive) || units[0];
    showUnit(firstUnit.id);

    return { element, refresh, showUnit, hasSummaryTab: Boolean(summaryPanel) };
}

/** Everything inside one unit's tab. */
function renderUnitPanel(form, unit) {
    return el('section', { className: 'dfr-unit-panel', dataset: { unitPanel: unit.id } }, [
        unit.identity ? renderIdentityCard(form, unit) : null,
        ...(unit.sections || []).map(section => form.addWidget(renderAccordion(form, section, unit))),
        unit.notes ? renderNotesCard(form, unit) : null,
    ]);
}

/** Model / serial / mark name, plus buttons such as "Pull from CAPS / order data". */
function renderIdentityCard(form, unit) {
    const fields = (unit.identity.fields || []).map(fieldConfig => createField(fieldConfig, form, { unit }));

    // The action needs to know which unit it is for, so we add unitId to a copy of it.
    const actionButtons = (unit.identity.actions || []).map(action =>
        createActionButton(form, { ...action, unitId: unit.id }, 'dfr-btn dfr-pull-btn'));

    return el('div', { className: 'dfr-unit-idcard' }, [
        el('div', { className: 'dfr-grid' }, fields.map(field => field.render())),
        ...actionButtons,
    ]);
}

/** The free-text notes box at the bottom of a unit. */
function renderNotesCard(form, unit) {
    const notesField = createField(unit.notes, form, { unit });

    return el('section', { className: 'dfr-card' }, [
        el('h3', { className: 'dfr-card-title', text: unit.notes.label || 'Notes' }),
        notesField.renderControl(), // just the text box; the card title already acts as the label
    ]);
}
