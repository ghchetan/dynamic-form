/**
 * Small helpers for building page elements.
 *
 * Rule of this codebase: we never put config text into `innerHTML`.
 * We always use `textContent` (which the helpers below do for you), so text coming
 * from the CRM can never inject HTML or scripts into the website.
 */

/**
 * Create an element in one call.
 *
 * @example
 *   el('div', { className: 'dfr-card', text: 'Hello' })
 *   el('input', { attrs: { type: 'number', placeholder: 'Volts' } })
 *   el('section', { className: 'dfr-card' }, [titleElement, gridElement])
 *
 * @param {string} tag                     HTML tag name, e.g. 'div'
 * @param {object}   [options]
 * @param {string}   [options.className]   CSS class(es)
 * @param {string}   [options.text]        Plain text content
 * @param {object}   [options.attrs]       Attributes, e.g. { type: 'number' }. null / undefined / false are skipped, true becomes an empty attribute.
 * @param {object}   [options.dataset]     data-* attributes, e.g. { unitId: 'u1' } becomes data-unit-id="u1"
 * @param {boolean}  [options.hidden]      Start hidden
 * @param {Function} [options.onClick]     Click handler
 * @param {Array<Node|string|null>} [children]  Children to append. null / undefined entries are skipped.
 * @returns {HTMLElement}
 */
export function el(tag, options = {}, children = []) {
    const element = document.createElement(tag);
    const { className, text, attrs = {}, dataset = {}, hidden, onClick } = options;

    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    if (hidden) element.hidden = true;
    if (onClick) element.addEventListener('click', onClick);

    for (const [name, value] of Object.entries(attrs)) {
        if (value === undefined || value === null || value === false) continue;
        element.setAttribute(name, value === true ? '' : value);
    }

    for (const [key, value] of Object.entries(dataset)) {
        if (value !== undefined && value !== null) element.dataset[key] = value;
    }

    appendChildren(element, children);
    return element;
}

/**
 * Create a <button type="button">.
 * type="button" matters: without it, a button inside a <form> would submit the form.
 */
export function button(label, className = '', onClick = null) {
    return el('button', { className, text: label, attrs: { type: 'button' }, onClick });
}

/** Append children to a parent, skipping null / undefined (handy for optional parts). */
export function appendChildren(parent, children) {
    children.forEach(child => {
        if (child !== null && child !== undefined && child !== false) parent.append(child);
    });
}

/**
 * Show a short message on a button ("Saved ✓", "Copied"), then put the original label back.
 * Clicking again while the message is showing keeps the real original label.
 */
export function flashButtonText(targetButton, message, durationMs = 1500) {
    if (!targetButton) return;

    if (!targetButton.dataset.originalLabel) targetButton.dataset.originalLabel = targetButton.textContent;
    targetButton.textContent = message;

    clearTimeout(Number(targetButton.dataset.flashTimer));
    targetButton.dataset.flashTimer = setTimeout(() => {
        targetButton.textContent = targetButton.dataset.originalLabel;
        delete targetButton.dataset.originalLabel;
    }, durationMs);
}

/**
 * Put a value into an input, unless the user is typing in that input right now.
 * (Overwriting the input the user is typing in would move their cursor.)
 */
export function setInputValue(input, value) {
    if (!input || input === document.activeElement) return;
    const text = value === undefined || value === null ? '' : String(value);
    if (input.value !== text) input.value = text;
}
