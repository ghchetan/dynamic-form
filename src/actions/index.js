import { button } from '../utils/dom.js';
import { toggleTimer } from './timerAction.js';
import { openEmailDraft } from './emailAction.js';
import { saveDraftAction } from './saveDraftAction.js';
import { runWorkflow } from './workflowAction.js';
import { pullUnitData } from './dataPullAction.js';

/**
 * Action registry — maps an action `type` from the JSON to the function that performs it.
 *
 * Every action function has the same signature:
 *   (form, action, button) => any
 *     form    the DynamicFormRenderer
 *     action  the action object from the JSON ({ id, type, label, ... })
 *     button  the button that was clicked (handy for "Loading…" text). May be null.
 *
 * ➜ To add a new action type: write the function in its own file and add one line here.
 *   Types that are NOT listed here are handed to the host page through the `onAction` callback,
 *   so the website can handle special buttons without changing this package.
 */
export const ACTION_HANDLERS = {
    timer: toggleTimer,
    email: openEmailDraft,
    print: () => window.print(),
    save: saveDraftAction,
    workflow: runWorkflow,
    dataPull: pullUnitData,
};

/** Run the action named in `action.type`. */
export function runAction(form, action, clickedButton = null) {
    const handler = ACTION_HANDLERS[action.type];
    if (handler) return handler(form, action, clickedButton);

    form.emitAction(action);
    return undefined;
}

/** Create a button that runs an action when clicked. */
export function createActionButton(form, action, className = 'dfr-btn') {
    const actionButton = button(action.label, className);
    actionButton.dataset.actionId = action.id;
    actionButton.addEventListener('click', () => runAction(form, action, actionButton));
    return actionButton;
}
