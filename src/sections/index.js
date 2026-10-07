import { renderCardSection } from './cardSection.js';
import { renderDeficiencySummary } from './deficiencySummary.js';
import { renderHoursTracker } from './hoursTracker.js';
import { renderEquipmentSummary } from './equipmentSummary.js';

/**
 * Section registry — maps a section `type` from the JSON to the function that draws it.
 *
 * Every section function has the same shape:
 *   (form, sectionConfig, context) => { element, refresh? }
 *     element   what to put on the page
 *     refresh   optional; called after any value changes (for sections that show live info)
 *
 * ➜ To add a new section type: write the function in its own file and add one line here.
 *   Unknown types fall back to a normal card.
 */
export const SECTION_TYPES = {
    card: renderCardSection,
    deficiencySummary: renderDeficiencySummary,
    hoursTracker: renderHoursTracker,
    equipmentStatusSummary: renderEquipmentSummary,
};

export function renderSection(form, section, context = {}) {
    const renderFunction = SECTION_TYPES[section.type] || renderCardSection;
    return renderFunction(form, section, context);
}
