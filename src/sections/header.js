import { el, button, flashButtonText } from '../utils/dom.js';
import { fillTemplate } from '../utils/template.js';
import { pluralize } from '../utils/format.js';
import { createField } from '../fields/index.js';

/**
 * Header — the dark bar at the top of the form:
 *
 *   ■ ACCUREX START-UP                         [Draft]
 *   Riverside Prep Kitchen — Bldg C
 *   SO-9904213 · Tech: J. Alvarez · 2026-09-01
 *   Live report link: https://crm...            [Copy]
 *   [Units on this project: 1 of 4 started] [Open deficiencies: None]
 *
 * @returns {{ element, refresh } | null}
 */
export function renderHeader(form) {
    const config = form.config.header;
    if (!config) return null;

    // Every header field is created so its value exists (the subtitle uses them),
    // but fields marked "hidden" are not drawn.
    const headerFields = (config.fields || []).map(fieldConfig => createField(fieldConfig, form, { area: 'header' }));
    const visibleFields = headerFields.filter(field => !field.config.hidden);

    const statusPill = el('span', { className: 'dfr-status' });
    const title = el('div', { className: 'dfr-job-title' });
    const subtitle = config.subtitleTemplate ? el('div', { className: 'dfr-job-sub' }) : null;
    const metrics = (config.metrics || []).map(metric => ({
        metric,
        valueElement: el('div', { className: 'dfr-meta-v', text: '—' }),
    }));

    const element = el('header', { className: 'dfr-header' }, [
        el('div', { className: 'dfr-header-row' }, [
            el('div', { className: 'dfr-brand' }, [
                el('span', { className: 'dfr-brand-dot' }),
                el('span', { text: config.brand || form.config.name }),
            ]),
            statusPill,
        ]),
        title,
        subtitle,
        ...visibleFields.map(renderHeaderField),
        metrics.length ? renderMetricStrip(metrics) : null,
    ]);

    function refresh() {
        const status = form.getReportStatus();
        statusPill.className = `dfr-status dfr-status-${status}`;
        statusPill.textContent = getStatusLabel(config, status);

        title.textContent = config.title?.field ? form.getValue(config.title.field) : form.config.name;
        if (subtitle) subtitle.textContent = fillTemplate(config.subtitleTemplate, form.values);

        metrics.forEach(({ metric, valueElement }) => updateMetric(form, metric, valueElement));
    }

    return { element, refresh };
}

/** A small labelled box in the header, e.g. "Live report link" with a Copy button. */
function renderHeaderField(field) {
    const control = field.renderControl();
    control.classList.add('dfr-control-compact');

    const copyButton = field.config.action?.type === 'copy'
        ? button(field.config.action.label || 'Copy', 'dfr-btn dfr-btn-primary dfr-btn-sm')
        : null;
    copyButton?.addEventListener('click', () => copyFieldValue(field, copyButton));

    return el('div', { className: 'dfr-header-field' }, [
        el('div', { className: 'dfr-header-field-label', text: field.config.label || '' }),
        el('div', { className: 'dfr-header-control-row' }, [control, copyButton]),
    ]);
}

/** Copy a field's value to the clipboard and show "Copied" on the button for a moment. */
async function copyFieldValue(field, copyButton) {
    try {
        await navigator.clipboard.writeText(String(field.value ?? ''));
        flashButtonText(copyButton, 'Copied');
    } catch {
        // Clipboard not allowed (e.g. page not on https): select the text so the user can copy it by hand.
        field.control?.select();
    }
}

function renderMetricStrip(metrics) {
    return el('div', { className: 'dfr-meta-strip' }, metrics.map(({ metric, valueElement }) =>
        el('div', { className: 'dfr-meta-box' }, [
            el('div', { className: 'dfr-meta-k', text: metric.label }),
            valueElement,
        ])));
}

/** "draft" → "Draft", using the labels from header.status.values in the config. */
function getStatusLabel(headerConfig, status) {
    const match = headerConfig.status?.values?.find(option => option.value === status);
    return match?.label || String(status || '').replace(/^./, firstLetter => firstLetter.toUpperCase());
}

/**
 * Metric registry — what each `metric.source` in the config shows.
 * Each function returns { text, className }.
 * ➜ To add a new metric: add one function here.
 */
const METRICS = {
    /** "2 of 4 started" (or just "4") */
    units(form, metric) {
        const units = form.getUnits();
        const startedCount = units.filter(unit => form.getUnitStatus(unit).started).length;
        const text = metric.display === 'startedOfTotal' ? `${startedCount} of ${units.length} started` : String(units.length);
        return { text, className: '' };
    },

    /** "3 items" in amber, or "None" in green */
    deficiencies(form) {
        const count = form.getDeficientFields().length;
        return count === 0
            ? { text: 'None', className: 'is-ok' }
            : { text: pluralize(count, 'item'), className: 'is-warn' };
    },
};

function updateMetric(form, metric, valueElement) {
    const calculate = METRICS[metric.source];
    if (!calculate) return;

    const { text, className } = calculate(form, metric);
    valueElement.textContent = text;
    valueElement.className = `dfr-meta-v ${className}`.trim();
}
