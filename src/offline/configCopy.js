import { STORES, getRecord, putRecord, isIndexedDbAvailable } from './database.js';

/**
 * A saved copy of the last form configuration downloaded from the CRM.
 * If the page is opened later without a connection, the form can still be drawn from this copy.
 *
 * Note: this only covers the JSON. For the page itself (HTML, CSS, JS) to open with no network,
 * the website needs its own service worker or cache.
 */

export async function saveConfigCopy(url, json) {
    if (!isIndexedDbAvailable()) return;
    try {
        await putRecord(STORES.CONFIGS, { url, savedAt: new Date().toISOString(), json });
    } catch (error) {
        console.warn('DynamicFormRenderer: could not keep an offline copy of the configuration.', error);
    }
}

/** @returns {Promise<object|null>} The saved JSON, or null when there is no copy. */
export async function loadConfigCopy(url) {
    if (!isIndexedDbAvailable()) return null;
    try {
        const record = await getRecord(STORES.CONFIGS, url);
        return record ? record.json : null;
    } catch {
        return null;
    }
}
