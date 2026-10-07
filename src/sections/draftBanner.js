import { el, button } from '../utils/dom.js';
import { pluralize } from '../utils/format.js';

/**
 * Draft banner — shown at the top of the form when a saved draft was restored:
 *
 *   Draft from 7 Oct 2026, 14:32 restored.                    [Discard draft]
 *
 * "Discard draft" deletes the draft and rebuilds the form with the values from the CRM.
 *
 * @param {{ savedAt: string, attachments?: object }} draft
 * @returns {{ element: HTMLElement }}
 */
export function renderDraftBanner(form, draft) {
    const photoCount = Object.values(draft.attachments || {}).reduce((total, files) => total + files.length, 0);
    const photoNote = photoCount > 0 ? ` (with ${pluralize(photoCount, 'photo')})` : '';

    const message = el('span', { text: `Draft from ${formatSavedAt(draft.savedAt)} restored${photoNote}.` });
    const discardButton = button('Discard draft', 'dfr-link-btn', () => form.discardDraft());

    return { element: el('div', { className: 'dfr-draft-banner', attrs: { role: 'status' } }, [message, discardButton]) };
}

/** "2026-10-07T09:02:00Z" → "7 Oct 2026, 14:32" in the user's own language and time zone. */
function formatSavedAt(isoText) {
    const date = new Date(isoText);
    if (Number.isNaN(date.getTime())) return 'an earlier visit';
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
