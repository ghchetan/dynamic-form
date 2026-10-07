import { HttpError, isTemporaryFailure } from './http.js';
import { getOfflineSettings } from '../offline/settings.js';
import { saveConfigCopy, loadConfigCopy } from '../offline/configCopy.js';

/**
 * Download the form configuration JSON from the CRM API (or a static file).
 *
 * Offline support: when the config has offline mode switched on, a copy is kept on the device.
 * If a later download fails because there is no connection, that copy is used instead.
 *
 * @param {string} url
 * @returns {Promise<object>} The parsed JSON
 */
export async function loadConfig(url) {
    if (!url) {
        throw new Error('DynamicFormRenderer: pass either `configUrl` or `config`.');
    }

    try {
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new HttpError(response.status);
        const json = await response.json();

        if (getOfflineSettings(json.form || json).enabled) {
            saveConfigCopy(url, json); // not awaited: don't make the first render wait for this
        }
        return json;
    } catch (error) {
        if (isTemporaryFailure(error)) {
            const savedCopy = await loadConfigCopy(url);
            if (savedCopy) {
                console.info('DynamicFormRenderer: no connection — using the saved copy of the form configuration.');
                return savedCopy;
            }
        }
        throw new Error(`DynamicFormRenderer: could not load the form configuration (${error.message}).`);
    }
}
