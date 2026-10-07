/**
 * Fill {placeholders} in a text with values.
 *
 * @example
 *   fillTemplate('Hi {leadName}', { leadName: 'John' })   → 'Hi John'
 *   fillTemplate('Order {salesOrder}', {})                 → 'Order {salesOrder}'
 *
 * Unknown placeholders are left as they are, so missing data is easy to spot.
 */
export function fillTemplate(template, values) {
    if (!template) return '';

    return String(template).replace(/\{([^}]+)\}/g, (placeholder, key) => {
        const value = values[key.trim()];
        return value === undefined || value === null ? placeholder : String(value);
    });
}
