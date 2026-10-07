/**
 * A thin, promise-based wrapper around IndexedDB (the browser's built-in database).
 *
 * IndexedDB's own API works with events (onsuccess / onerror). These helpers turn it into
 * simple async functions, so the rest of the code can just write:
 *
 *     await putRecord(STORES.DRAFTS, { formId: 'abc', values: {...} });
 *     const draft = await getRecord(STORES.DRAFTS, 'abc');
 *
 * Why IndexedDB and not localStorage?
 *   - it can store files (photos), localStorage only stores text
 *   - it can hold far more data (hundreds of MB instead of about 5 MB)
 */

const DATABASE_NAME = 'AccurexDynamicForms';

/** Increase this number when you add or change a store below; onupgradeneeded will run again. */
const DATABASE_VERSION = 1;

/** The "tables" in our database. */
export const STORES = Object.freeze({
    DRAFTS: 'drafts',   // one saved draft per form          (key: formId)
    OUTBOX: 'outbox',   // submissions waiting to be sent     (key: id, numbered automatically)
    CONFIGS: 'configs', // last downloaded form configuration (key: url)
});

let databasePromise = null;

export function isIndexedDbAvailable() {
    return typeof indexedDB !== 'undefined';
}

/** Open the database once and reuse it. */
function openDatabase() {
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

        // Runs the first time on a device (or when DATABASE_VERSION goes up): create the stores.
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(STORES.DRAFTS)) {
                database.createObjectStore(STORES.DRAFTS, { keyPath: 'formId' });
            }
            if (!database.objectStoreNames.contains(STORES.OUTBOX)) {
                database.createObjectStore(STORES.OUTBOX, { keyPath: 'id', autoIncrement: true });
            }
            if (!database.objectStoreNames.contains(STORES.CONFIGS)) {
                database.createObjectStore(STORES.CONFIGS, { keyPath: 'url' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    // If opening failed (e.g. blocked in private browsing), allow a fresh attempt next time.
    databasePromise.catch(() => { databasePromise = null; });
    return databasePromise;
}

/**
 * Run one operation on one store and wait until it is safely written/read.
 * @param {string} storeName   One of STORES
 * @param {'readonly'|'readwrite'} mode
 * @param {(store: IDBObjectStore) => IDBRequest} operation
 */
async function runInStore(storeName, mode, operation) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const request = operation(transaction.objectStore(storeName));

        // Wait for the whole transaction (not just the request) so the data is really saved.
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

/** Read one record by its key. Resolves to undefined when it does not exist. */
export function getRecord(storeName, key) {
    return runInStore(storeName, 'readonly', store => store.get(key));
}

/** Read every record in a store, in key order. */
export function getAllRecords(storeName) {
    return runInStore(storeName, 'readonly', store => store.getAll());
}

/** Insert or replace a record. Resolves to the record's key. */
export function putRecord(storeName, record) {
    return runInStore(storeName, 'readwrite', store => store.put(record));
}

/** Delete a record by its key. */
export function deleteRecord(storeName, key) {
    return runInStore(storeName, 'readwrite', store => store.delete(key));
}
