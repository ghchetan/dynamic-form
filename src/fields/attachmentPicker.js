import { el, button } from '../utils/dom.js';
import { pluralize } from '../utils/format.js';

/** One preview URL per file, created once. (Creating a new URL on every refresh would leak memory.) */
const previewUrls = new WeakMap();

function getPreviewUrl(file) {
    if (!previewUrls.has(file)) previewUrls.set(file, URL.createObjectURL(file));
    return previewUrls.get(file);
}

/**
 * The "📷 Attach photo" button shown under a field, with thumbnails of the chosen photos.
 *
 * Config example (on any field):
 *   "attachments": { "enabled": true, "type": "image", "multiple": true, "capture": "environment", "label": "Attach photo" }
 *
 * The files are kept on the form (form.attachments), not here. refresh() redraws the thumbnails
 * from the form, so photos restored from an offline draft show up too.
 *
 * @param {BaseField} field  The field the photos belong to
 * @returns {{ element: HTMLElement, refresh: Function }}
 */
export function renderAttachmentPicker(field) {
    const settings = field.config.attachments;
    const isImage = settings.type === 'image';
    const fileWord = isImage ? 'photo' : 'file';
    const buttonLabel = `📷 ${settings.label || 'Attach photo'}`;

    // The real file input is hidden; our nicer button opens it.
    const fileInput = el('input', {
        hidden: true,
        attrs: {
            type: 'file',
            accept: isImage ? 'image/*' : null,
            multiple: Boolean(settings.multiple),
            capture: settings.capture, // "environment" opens the back camera on phones
        },
    });

    const pickButton = button(buttonLabel, 'dfr-photo-btn', () => fileInput.click());
    const thumbnails = el('div', { className: 'dfr-photo-strip' });
    let shownFileCount = -1;

    fileInput.addEventListener('change', () => {
        field.form.addAttachments(field.name, [...fileInput.files]);
        fileInput.value = ''; // lets the user pick the same file again
        refresh();
    });

    function refresh() {
        const files = field.form.getAttachments(field.name);
        if (files.length === shownFileCount) return; // nothing new to draw
        shownFileCount = files.length;

        thumbnails.replaceChildren(...files
            .filter(file => file.type?.startsWith('image/'))
            .map(file => el('img', { className: 'dfr-photo-thumb', attrs: { src: getPreviewUrl(file), alt: file.name } })));

        pickButton.classList.toggle('is-attached', files.length > 0);
        pickButton.textContent = files.length > 0 ? `✓ ${pluralize(files.length, fileWord)} attached` : buttonLabel;
    }

    const element = el('div', { className: 'dfr-photo-row' }, [pickButton, fileInput, thumbnails]);
    return { element, refresh };
}
