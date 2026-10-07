import { flashButtonText } from '../utils/dom.js';

/**
 * "Save draft" button — keeps a copy of all values (and, in offline mode, the photos) on this device.
 * The next time the form opens on this device, the draft is restored (see DynamicFormRenderer.render).
 *
 * The host page is told through the `onAction` callback with { type: 'saved', key }.
 */
export async function saveDraftAction(form, action, button) {
    const key = await form.saveDraft();

    if (!key) {
        flashButtonText(button, 'Could not save');
        return;
    }

    flashButtonText(button, 'Saved ✓');
    form.emitAction({ id: action.id || 'saveDraft', type: 'saved', key });
}
