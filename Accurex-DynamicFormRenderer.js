/**
 * Accurex Dynamic Form — entry point.
 *
 * Add these two lines to the page:
 *   <link rel="stylesheet" href="Accurex-dynamic-form.css">
 *   <script type="module" src="Accurex-DynamicFormRenderer.js"></script>
 *
 * This file makes DynamicFormRenderer available in two ways:
 *   - window.DynamicFormRenderer             → for normal inline <script> tags (see sample.html)
 *   - import { DynamicFormRenderer } from …  → for other JavaScript modules
 *
 * All the real code lives in ./src. Start reading at src/DynamicFormRenderer.js.
 */
import { DynamicFormRenderer } from './src/DynamicFormRenderer.js';

window.DynamicFormRenderer = DynamicFormRenderer;

export { DynamicFormRenderer };

// Registries and the base class are exported so a website can add its own
// field types, section types, actions or rules without editing this package.
export { FIELD_TYPES } from './src/fields/index.js';
export { BaseField } from './src/fields/BaseField.js';
export { SECTION_TYPES } from './src/sections/index.js';
export { ACTION_HANDLERS } from './src/actions/index.js';
export { EVALUATORS } from './src/evaluators/index.js';
