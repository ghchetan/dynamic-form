import { fillTemplate } from '../utils/template.js';

/**
 * "Pull from CAPS / order data" button — fills a unit's identity fields (model, serial, ...)
 * from another system.
 *
 * Config example:
 *   action:      { "type": "dataPull", "source": "CAPS", "label": "Pull from CAPS / order data" }
 *   dataSources: { "CAPS": { "url": "/api/caps/order/{salesOrder}/unit/{unitId}", "method": "GET" } }
 *   field:       { "name": "u4Model", "prefill": { "source": "CAPS", "field": "model" } }
 *                → copies response.model into u4Model
 *
 * Where the data comes from (first match wins):
 *   1. The host page's `onDataPull` callback, if given (lets the website add auth headers etc.)
 *   2. The URL in config.dataSources[action.source]
 *   3. Otherwise the action is passed to the host page through `onAction`.
 */
export async function pullUnitData(form, action, button) {
    const unit = form.getUnits().find(item => item.id === action.unitId);
    if (!unit) return;

    // Option 1: the host page fetches the data itself.
    if (form.callbacks.onDataPull) {
        const data = await form.callbacks.onDataPull(action, form);
        if (data) applyPulledData(form, unit, data);
        return;
    }

    // Option 2: fetch from the data source in the config.
    const source = form.config.dataSources?.[action.source];
    if (!source) {
        form.emitAction(action);
        return;
    }

    const originalLabel = button?.textContent;
    setButton(button, 'Pulling…', true);

    try {
        const url = fillTemplate(source.url, { ...form.values, unitId: unit.id });
        const response = await fetch(url, { method: source.method || 'GET', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        applyPulledData(form, unit, await response.json(), source.mapping);
        setButton(button, `✓ Synced from ${action.source}`, false);
    } catch (error) {
        console.error(`DynamicFormRenderer: could not pull data for unit "${unit.id}".`, error);
        setButton(button, originalLabel, false);
    }
}

/** Copy values from the response into the unit's identity fields. */
function applyPulledData(form, unit, data, mapping = {}) {
    (unit.identity?.fields || []).forEach(fieldConfig => {
        const responseKey = fieldConfig.prefill?.field || mapping[fieldConfig.name];
        if (responseKey && data[responseKey] !== undefined && data[responseKey] !== null) {
            form.values[fieldConfig.name] = data[responseKey];
        }
    });

    // One refresh at the end copies all new values into their inputs.
    form.refresh();
}

function setButton(button, text, disabled) {
    if (!button) return;
    button.textContent = text;
    button.disabled = disabled;
}
