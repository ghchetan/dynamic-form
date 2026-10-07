import { STORES, getAllRecords, putRecord, deleteRecord } from './database.js';

/**
 * Outbox — submissions that could not be sent yet (no connection, or the server was down).
 * Works like the outbox of an email app: items wait here until they are sent.
 *
 * One outbox entry looks like:
 *   {
 *     id: 7,                                  // numbered automatically, so older entries have smaller ids
 *     formId: 'accurexStartupReport',
 *     queuedAt: '2026-10-07T09:02:00.000Z',
 *     request: { url, method, headers, body }, // exactly what will be sent (see core/http.js)
 *     failed: false,                          // true when the server refused it; it is then NOT retried
 *     error: null,                            // why it failed
 *   }
 */

/** Add a request to the outbox. */
export async function addToOutbox(formId, request) {
    return putRecord(STORES.OUTBOX, {
        formId,
        queuedAt: new Date().toISOString(),
        request,
        failed: false,
        error: null,
    });
}

/** All entries for one form, oldest first. */
export async function getOutboxEntries(formId) {
    const allEntries = await getAllRecords(STORES.OUTBOX);
    return allEntries
        .filter(entry => entry.formId === formId)
        .sort((a, b) => a.id - b.id);
}

export async function removeFromOutbox(id) {
    return deleteRecord(STORES.OUTBOX, id);
}

/**
 * Keep the entry (so no report is ever thrown away) but stop retrying it.
 * Support can still find it in the browser's IndexedDB ("AccurexDynamicForms" → "outbox").
 */
export async function markOutboxEntryFailed(entry, errorMessage) {
    return putRecord(STORES.OUTBOX, { ...entry, failed: true, error: errorMessage });
}
