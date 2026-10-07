import { STORES, getRecord, putRecord, deleteRecord } from './database.js';

/**
 * Draft stores — where "Save draft" keeps the form's values on this device.
 *
 * There are two stores with the SAME three methods, so the form does not care which one it uses:
 *
 *   save(formId, version, values, attachments) → where it was saved (string), or null on failure
 *   load(formId)                               → { values, attachments, savedAt, version } or null
 *   remove(formId)
 *
 * The form picks one with chooseDraftStore() based on the config's offline settings.
 * Every method catches storage errors, so a storage problem never breaks the form.
 */

// ───────────────────────────── localStorage (simple, text only) ─────────────────────────────

const LOCAL_KEY_PREFIX = 'DynamicFormRenderer:';

/** Works in every browser, but only stores text — photos are NOT kept. */
export const localStorageDraftStore = {
    name: 'localStorage',

    async save(formId, version, values) {
        const key = `${LOCAL_KEY_PREFIX}${formId}`;
        try {
            localStorage.setItem(key, JSON.stringify({ formId, version, savedAt: new Date().toISOString(), values }));
            return key;
        } catch (error) {
            console.error('DynamicFormRenderer: could not save the draft in localStorage.', error);
            return null;
        }
    },

    async load(formId) {
        try {
            const text = localStorage.getItem(`${LOCAL_KEY_PREFIX}${formId}`);
            if (!text) return null;

            const draft = JSON.parse(text);
            // Drafts saved by the first version of this package used "state" instead of "values".
            const values = draft.values || draft.state;
            if (!values || typeof values !== 'object') return null;

            return { values, attachments: {}, savedAt: draft.savedAt, version: draft.version };
        } catch (error) {
            console.warn('DynamicFormRenderer: ignoring a saved draft that could not be read.', error);
            return null;
        }
    },

    async remove(formId) {
        try {
            localStorage.removeItem(`${LOCAL_KEY_PREFIX}${formId}`);
        } catch {
            // Storage blocked: there is no draft to delete either.
        }
    },
};

// ───────────────────────────── IndexedDB (offline mode, keeps photos) ─────────────────────────────

/** Keeps values AND photos (File objects), and has room for much more data. */
export const indexedDbDraftStore = {
    name: 'indexedDB',

    async save(formId, version, values, attachments = new Map()) {
        try {
            await putRecord(STORES.DRAFTS, {
                formId,
                version,
                savedAt: new Date().toISOString(),
                values,
                attachments: Object.fromEntries(attachments), // { fieldName: [File, File] }
            });
            return `indexedDB:${STORES.DRAFTS}/${formId}`;
        } catch (error) {
            console.error('DynamicFormRenderer: could not save the draft in IndexedDB. Saving without photos instead.', error);
            return localStorageDraftStore.save(formId, version, values);
        }
    },

    async load(formId) {
        try {
            const record = await getRecord(STORES.DRAFTS, formId);
            if (record) {
                return { values: record.values, attachments: record.attachments || {}, savedAt: record.savedAt, version: record.version };
            }
        } catch (error) {
            console.warn('DynamicFormRenderer: could not read the draft from IndexedDB.', error);
        }
        // Nothing in IndexedDB: maybe a draft was saved in localStorage before offline mode was switched on.
        return localStorageDraftStore.load(formId);
    },

    async remove(formId) {
        try {
            await deleteRecord(STORES.DRAFTS, formId);
        } catch (error) {
            console.warn('DynamicFormRenderer: could not delete the draft from IndexedDB.', error);
        }
        await localStorageDraftStore.remove(formId);
    },
};

/** IndexedDB when offline mode asks for it, otherwise localStorage. */
export function chooseDraftStore(offlineSettings) {
    return offlineSettings.useIndexedDb ? indexedDbDraftStore : localStorageDraftStore;
}
