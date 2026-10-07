import { isIndexedDbAvailable } from './database.js';

/**
 * Read the offline settings from the config:
 *
 *   "behavior": { "offline": { "enabled": true, "storage": "indexedDB", "autoSync": true } }
 *
 * @returns {{ enabled: boolean, useIndexedDb: boolean, autoSync: boolean }}
 *   enabled       offline mode is switched on
 *   useIndexedDb  drafts (with photos) and the outbox live in IndexedDB.
 *                 False when the config asks for another storage or the browser has no IndexedDB;
 *                 drafts then fall back to localStorage and there is no outbox.
 *   autoSync      waiting submissions are sent automatically when the connection comes back
 */
export function getOfflineSettings(formConfig) {
    const offline = formConfig?.behavior?.offline || {};
    const enabled = offline.enabled === true;
    const useIndexedDb = enabled && offline.storage === 'indexedDB' && isIndexedDbAvailable();

    return {
        enabled,
        useIndexedDb,
        autoSync: useIndexedDb && offline.autoSync !== false,
    };
}
