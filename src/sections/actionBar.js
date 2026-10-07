import { el } from '../utils/dom.js';
import { createActionButton } from '../actions/index.js';

/**
 * Action bar — the row of buttons fixed to the bottom of the screen
 * (Save draft · Print / PDF · Email · Submit for review).
 *
 * Config: the top-level `actions` array. Add "style": "primary" to make a button blue.
 *
 * @returns {{ element: HTMLElement } | null}
 */
export function renderActionBar(form) {
    const actions = form.config.actions || [];
    if (actions.length === 0) return null;

    const buttons = actions.map(action =>
        createActionButton(form, action, action.style === 'primary' ? 'dfr-btn dfr-btn-primary' : 'dfr-btn'));

    const element = el('div', { className: 'dfr-actionbar' }, [
        el('div', { className: 'dfr-actionbar-inner' }, buttons),
    ]);

    return { element };
}
