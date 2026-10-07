import { el, button } from '../utils/dom.js';
import { pluralize } from '../utils/format.js';

/**
 * Sync status bar — tells the technician about the connection and waiting reports:
 *
 *   You're offline. Your answers stay on this device. 1 report waiting to be sent.
 *   1 report waiting to be sent.                                          [Send now]
 *
 * Hidden when online and nothing is waiting. Only shown when offline mode is on.
 *
 * @returns {{ element, refresh } | null}
 */
export function renderSyncStatus(form) {
    const sync = form.offlineSync;
    if (!sync) return null;

    const message = el('span');
    const sendNowButton = button('Send now', 'dfr-link-btn', () => sync.syncNow());
    const element = el('div', { className: 'dfr-sync-status', hidden: true, attrs: { role: 'status' } }, [message, sendNowButton]);

    function refresh() {
        const { isOnline, isSyncing, pendingCount, failedCount } = sync.getState();
        const sentences = [];

        if (!isOnline) sentences.push("You're offline. Your answers stay on this device.");
        if (isSyncing) sentences.push(`Sending ${pluralize(pendingCount, 'report')}…`);
        else if (pendingCount > 0) sentences.push(`${pluralize(pendingCount, 'report')} waiting to be sent.`);
        if (failedCount > 0) sentences.push(`${pluralize(failedCount, 'report')} could not be sent: the server refused it. Please contact support.`);

        element.hidden = sentences.length === 0;
        element.classList.toggle('is-offline', !isOnline);
        element.classList.toggle('has-error', failedCount > 0);
        message.textContent = sentences.join(' ');
        sendNowButton.hidden = !isOnline || isSyncing || pendingCount === 0;
    }

    return { element, refresh };
}
