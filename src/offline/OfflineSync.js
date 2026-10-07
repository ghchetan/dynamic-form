import { sendRequest, isTemporaryFailure } from '../core/http.js';
import { addToOutbox, getOutboxEntries, removeFromOutbox, markOutboxEntryFailed } from './outbox.js';

/** While reports are waiting and the device is online, try sending them this often. */
const RETRY_EVERY_MS = 30 * 1000;

/** Name of the browser lock that makes sure only one tab sends the outbox at a time. */
const OUTBOX_LOCK_NAME = 'accurex-dynamic-form-outbox';

/**
 * OfflineSync — sends waiting submissions (the outbox) to the server.
 *
 * When does it send?
 *   - right after the form opens
 *   - when the browser reports that the connection is back (the "online" event)
 *   - every 30 seconds while something is waiting (covers "online, but the server was down")
 *   - when the user clicks "Send now" in the status bar
 *
 * Rules:
 *   - Oldest first, so the CRM receives reports in the order they were made.
 *   - Temporary failure (no network, server down) → stop and try again later.
 *   - Server refused it (e.g. 400) → keep it, mark it failed, don't retry, call onSubmitError.
 *   - Sent → remove it, call onSubmitSuccess, and delete the local draft if it is not newer.
 */
export class OfflineSync {
    constructor(form, settings) {
        this.form = form;
        this.formId = form.config.id;
        this.autoSync = settings.autoSync;

        // What the status bar shows
        this.pendingCount = 0;  // waiting to be sent
        this.failedCount = 0;   // refused by the server
        this.isSyncing = false;

        this.retryIntervalId = null;

        // Arrow functions keep `this` pointing at this object when the browser calls them.
        this.handleOnline = () => {
            this.form.refresh();
            if (this.autoSync) this.syncNow();
        };
        this.handleOffline = () => this.form.refresh();
    }

    /** Start listening for connection changes and send anything left over from earlier visits. */
    async start() {
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);

        await this.updateCounts();
        this.form.refresh();

        if (this.autoSync) {
            this.retryIntervalId = setInterval(() => {
                if (this.pendingCount > 0) this.syncNow();
            }, RETRY_EVERY_MS);
            this.syncNow();
        }
    }

    /** Stop listening (called when the form is destroyed or rebuilt). */
    stop() {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        clearInterval(this.retryIntervalId);
    }

    /** Everything the status bar needs to know. */
    getState() {
        return {
            isOnline: navigator.onLine,
            isSyncing: this.isSyncing,
            pendingCount: this.pendingCount,
            failedCount: this.failedCount,
        };
    }

    /** Put a request in the outbox (used by form.submit() when it cannot send right now). */
    async queue(request) {
        await addToOutbox(this.formId, request);
        await this.updateCounts();
        this.form.refresh();
    }

    /** Try to send everything that is waiting. Safe to call at any time; extra calls are ignored. */
    async syncNow() {
        if (this.isSyncing || !navigator.onLine || this.pendingCount === 0) return;

        this.isSyncing = true;
        this.form.refresh();

        try {
            await withOutboxLock(() => this.sendWaitingEntries());
        } catch (error) {
            console.error('DynamicFormRenderer: sending the offline queue failed.', error);
        } finally {
            this.isSyncing = false;
            await this.updateCounts();
            this.form.refresh();
        }
    }

    /** Send the waiting entries one by one, oldest first. */
    async sendWaitingEntries() {
        // Read the outbox INSIDE the lock: another tab may have just sent some entries.
        const entries = (await getOutboxEntries(this.formId)).filter(entry => !entry.failed);

        for (const entry of entries) {
            try {
                const responseData = await sendRequest(entry.request);
                await removeFromOutbox(entry.id);
                await this.form.clearDraftAfterSubmit(entry.queuedAt);
                this.form.callbacks.onSubmitSuccess?.(responseData, this.form);
            } catch (error) {
                if (isTemporaryFailure(error)) return; // still can't reach the server: try again later

                await markOutboxEntryFailed(entry, error.message);
                this.form.callbacks.onSubmitError?.(error, this.form);
            }
        }
    }

    async updateCounts() {
        try {
            const entries = await getOutboxEntries(this.formId);
            this.failedCount = entries.filter(entry => entry.failed).length;
            this.pendingCount = entries.length - this.failedCount;
        } catch (error) {
            console.warn('DynamicFormRenderer: could not read the offline queue.', error);
        }
    }
}

/**
 * Two browser tabs with the same form could both try to send the outbox at once and send
 * a report twice. A Web Lock lets only one tab send at a time; the other waits its turn.
 * Browsers without Web Locks just run the task.
 */
function withOutboxLock(task) {
    if (navigator.locks?.request) return navigator.locks.request(OUTBOX_LOCK_NAME, task);
    return task();
}
