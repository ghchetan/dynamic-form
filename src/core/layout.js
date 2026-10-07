/**
 * Page layout from the config:
 *
 *   "layout": { "maxWidth": 640, "columns": 2 }
 *
 *   maxWidth  how wide the form may get. A number means pixels (640 → "640px"); a CSS length
 *             string such as "48rem" or "100%" is used as is.
 *   columns   how many columns the field grids have on wider screens. On phones (≤ 520px) the
 *             CSS always shows one column.
 *
 * The values are handed to the CSS as two variables on the <form>:
 *   --dfr-max-width  and  --dfr-columns
 * so all sizing stays in Accurex-dynamic-form.css.
 */

export const DEFAULT_LAYOUT = Object.freeze({ maxWidth: '640px', columns: 2 });

/**
 * Read and check the layout settings. Invalid values fall back to the defaults (with a warning).
 * @returns {{ maxWidth: string, columns: number }}
 */
export function getLayout(formConfig) {
    const layout = formConfig.layout || {};
    return {
        maxWidth: readMaxWidth(layout.maxWidth),
        columns: readColumns(layout.columns),
    };
}

/** Give the CSS variables to the form element. */
export function applyLayout(formElement, layout) {
    formElement.style.setProperty('--dfr-max-width', layout.maxWidth);
    formElement.style.setProperty('--dfr-columns', String(layout.columns));
}

function readMaxWidth(value) {
    if (value === undefined || value === null) return DEFAULT_LAYOUT.maxWidth;
    if (typeof value === 'number' && value > 0) return `${value}px`;
    if (typeof value === 'string' && CSS.supports('max-width', value)) return value;

    console.warn(`DynamicFormRenderer: layout.maxWidth "${value}" is not valid. Using ${DEFAULT_LAYOUT.maxWidth}.`);
    return DEFAULT_LAYOUT.maxWidth;
}

function readColumns(value) {
    if (value === undefined || value === null) return DEFAULT_LAYOUT.columns;
    if (Number.isInteger(value) && value >= 1) return value;

    console.warn(`DynamicFormRenderer: layout.columns "${value}" is not a whole number of 1 or more. Using ${DEFAULT_LAYOUT.columns}.`);
    return DEFAULT_LAYOUT.columns;
}
