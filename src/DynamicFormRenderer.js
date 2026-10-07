import { el, appendChildren } from './utils/dom.js';
import { isEmpty } from './utils/format.js';
import { loadConfig } from './core/loadConfig.js';
import { getUnitStatus } from './core/status.js';
import { getLayout, applyLayout } from './core/layout.js';
import { sendRequest, buildSubmitRequest, isTemporaryFailure } from './core/http.js';
import { getOfflineSettings } from './offline/settings.js';
import { chooseDraftStore } from './offline/draftStores.js';
import { OfflineSync } from './offline/OfflineSync.js';
import { setUpOfflinePage } from './offline/serviceWorkerSetup.js';
import { DEFAULT_STATUS_FIELD } from './constants.js';
import { runAction } from './actions/index.js';
import { renderSection } from './sections/index.js';
import { renderHeader } from './sections/header.js';
import { renderUnits } from './sections/units.js';
import { renderSummaryPanel } from './sections/summaryPanel.js';
import { renderReviewer } from './sections/reviewer.js';
import { renderActionBar } from './sections/actionBar.js';
import { renderDraftBanner } from './sections/draftBanner.js';
import { renderSyncStatus } from './sections/syncStatus.js';

/**
 * DynamicFormRenderer — builds a complete form on a web page from a JSON configuration
 * (the configuration comes from the CRM API).
 *
 * ─────────────────────────── HOW IT WORKS (read this first) ───────────────────────────
 *
 *  1. render() loads the JSON (from `configUrl`, or the `config` object you pass in).
 *
 *  2. It builds the page block by block, top to bottom:
 *        header → top sections → unit tabs (+ summary) → reviewer → bottom action bar
 *     Every field in the JSON becomes a "field object" (see src/fields/).
 *
 *  3. ALL values live in ONE place: `this.values`  (field name → value).
 *
 *  4. When the user changes something, the field calls  form.setValue(name, value).
 *     setValue() stores the value and calls refresh().
 *
 *  5. refresh() asks every field and every "widget" to update itself from `this.values`.
 *     A widget is any block that shows information derived from many fields
 *     (deficiency list, progress chips, tab dots, header metrics, ...).
 *
 *  So the whole data flow is:   user input → setValue() → this.values → refresh() → screen
 *
 *  Drafts: "Save draft" stores this.values in the browser. The next render() puts those
 *  values back over the defaults and shows a "Draft restored · Discard draft" banner.
 *
 *  Offline (config.behavior.offline): drafts, including photos, are kept in IndexedDB.
 *  submit() without a connection puts the report in an outbox, and OfflineSync sends it
 *  when the connection is back. With `serviceWorkerUrl`, the page itself also opens offline.
 *  See src/offline/ and service-worker.js.
 *
 * ─────────────────────────── USING IT ON A PAGE ───────────────────────────
 *
 *   const form = new DynamicFormRenderer({ container: '#formHost', configUrl: '/api/forms/startup' });
 *   await form.render();
 *   form.getData();       // all current values, attachments and unit statuses
 *   await form.submit();  // POST to config.submission.url (queued when offline)
 *   form.destroy();       // stop timers and background syncing, remove the form
 */
export class DynamicFormRenderer {
    /**
     * @param {object} options
     * @param {string|HTMLElement} options.container  CSS selector or element to draw the form into
     * @param {string}   [options.configUrl]        URL of the JSON configuration (CRM API)
     * @param {object}   [options.config]           The configuration object itself (instead of configUrl)
     * @param {boolean}  [options.restoreDraft=true] Put back values saved with "Save draft" on this device
     * @param {string}   [options.serviceWorkerUrl] e.g. 'service-worker.js' — lets the page open offline
     *                                              (only used when the config switches offline mode on)
     * @param {Function} [options.onFieldChange]    (name, value, fieldConfig, form) — after the user changes a value
     * @param {Function} [options.onSubmitSuccess]  (responseData, form) — after submit() succeeds
     * @param {Function} [options.onSubmitError]    (error, form) — after submit() fails
     * @param {Function} [options.onSubmitQueued]   (data, form) — submit() saved the report to send later (offline)
     * @param {Function} [options.onWorkflow]       (action, data, form) — "Submit for review", "Approve", "Reject"
     * @param {Function} [options.onDataPull]       (action, form) → data — fetch unit data (CAPS) yourself
     * @param {Function} [options.onAction]         (action, data, form) — any action this package does not handle itself
     */
    constructor(options = {}) {
        this.container = typeof options.container === 'string'
            ? document.querySelector(options.container)
            : options.container;
        if (!this.container) throw new Error('DynamicFormRenderer: container not found.');

        this.configUrl = options.configUrl || null;
        this.providedConfig = options.config || null;
        this.restoreDraft = options.restoreDraft !== false;
        this.serviceWorkerUrl = options.serviceWorkerUrl || null;
        this.callbacks = {
            onFieldChange: options.onFieldChange,
            onSubmitSuccess: options.onSubmitSuccess,
            onSubmitError: options.onSubmitError,
            onSubmitQueued: options.onSubmitQueued,
            onWorkflow: options.onWorkflow,
            onDataPull: options.onDataPull,
            onAction: options.onAction,
        };

        this.config = null;       // the "form" object from the JSON
        this.formElement = null;  // the <form> on the page
        this.resetState();
    }

    // ══════════════════════════════ Building the form ══════════════════════════════

    /** Load the configuration and draw the form. Can be called again to rebuild it. */
    async render() {
        const json = this.providedConfig || await loadConfig(this.configUrl);
        this.config = json.form || json; // the API may wrap the form in { "form": { ... } }
        if (!this.config?.id) throw new Error('DynamicFormRenderer: the configuration has no form "id".');

        this.stopBackgroundWork(); // from a previous render, if any
        this.resetState();
        this.setHeaderValues();
        this.layout = getLayout(this.config); // read before building: fields need the column count

        // Offline mode decides where drafts live and whether there is an outbox.
        const offlineSettings = getOfflineSettings(this.config);
        this.draftStore = chooseDraftStore(offlineSettings);
        this.offlineSync = offlineSettings.useIndexedDb ? new OfflineSync(this, offlineSettings) : null;

        const draft = this.restoreDraft ? await this.draftStore.load(this.config.id) : null;
        this.formElement = this.buildForm(draft);
        // After buildForm every field has registered its default value; now the draft can overwrite them.
        if (draft) this.applyDraft(draft);

        this.container.classList.add('dfr-host');
        this.container.replaceChildren(this.formElement);

        this.refresh();
        await this.offlineSync?.start(); // sends reports left over from an earlier visit

        // Not awaited: storing the page's files for offline use happens in the background.
        if (offlineSettings.enabled && this.serviceWorkerUrl) setUpOfflinePage(this.serviceWorkerUrl);
        return this;
    }

    /** Clear everything that belongs to a previous render. */
    resetState() {
        this.values = {};                // field name → current value. THE single source of truth.
        this.fields = [];                // every field object on the form
        this.fieldsByName = new Map();   // value name → field object (quick lookup)
        this.widgets = [];               // blocks that need refresh() after a value changes
        this.attachments = new Map();    // field name → File[]
        this.timers = new Map();         // timer action id → setInterval id
        this.unitTabs = null;            // the units widget (lets us switch tabs)
        this.layout = null;              // { maxWidth, columns } from config.layout (src/core/layout.js)
        this.draftStore = null;          // where "Save draft" keeps data (src/offline/draftStores.js)
        this.offlineSync = null;         // sends the offline outbox (only when offline mode uses IndexedDB)
    }

    /** Values that come from the header config rather than from a field: report status and job title. */
    setHeaderValues() {
        const header = this.config.header || {};
        this.values[this.getStatusFieldName()] = header.status?.defaultValue || 'draft';
        if (header.title?.field) this.values[header.title.field] = header.title.defaultValue || '';
    }

    // ══════════════════════════════ Drafts ══════════════════════════════

    /**
     * Copy a saved draft's values (and photos) over the defaults.
     * Anything for fields that no longer exist in the configuration is ignored.
     * No need to touch the inputs: the refresh() at the end of render() copies values into them.
     */
    applyDraft(draft) {
        for (const [name, value] of Object.entries(draft.values)) {
            if (name in this.values) this.values[name] = value;
        }
        for (const [fieldName, files] of Object.entries(draft.attachments || {})) {
            if (this.fieldsByName.has(fieldName) && Array.isArray(files)) this.attachments.set(fieldName, files);
        }
    }

    /** Save values (and, in offline mode, photos) on this device. Returns where it was saved, or null. */
    saveDraft() {
        return this.draftStore.save(this.config.id, this.config.version, this.values, this.attachments);
    }

    /** Delete the saved draft and rebuild the form with the original values. Used by the draft banner. */
    async discardDraft() {
        await this.draftStore.remove(this.config.id);
        await this.render();
    }

    /**
     * Delete the local draft once a report has reached the CRM —
     * unless the draft was saved AFTER that report was made (the user kept working).
     * @param {string} submittedAt  ISO date of when the report was made
     */
    async clearDraftAfterSubmit(submittedAt) {
        const draft = await this.draftStore.load(this.config.id);
        if (draft && draft.savedAt <= submittedAt) await this.draftStore.remove(this.config.id);
    }

    /**
     * Build the whole <form> element, block by block.
     * @param {object|null} draft  The restored draft, if any (shows the "Draft restored" banner).
     */
    buildForm(draft) {
        const formElement = el('form', {
            className: `dfr-form ${this.config.theme?.cssClass || ''}`.trim(),
            attrs: { id: this.config.id, novalidate: true },
        });
        formElement.addEventListener('submit', event => event.preventDefault());
        applyLayout(formElement, this.layout); // maxWidth and columns → CSS variables

        const header = this.addWidget(renderHeader(this));

        // The centred content column.
        const shell = el('div', { className: 'dfr-shell' });
        this.unitTabs = renderUnits(this);

        appendChildren(shell, [
            this.addWidget(renderSyncStatus(this)),
            draft ? this.addWidget(renderDraftBanner(this, draft)) : null,
            ...this.renderTopSections(),
            this.addWidget(this.unitTabs),
            // When there is no "Summary" tab, show the summary sections below the units instead.
            this.unitTabs?.hasSummaryTab ? null : this.addWidget(renderSummaryPanel(this)),
            this.addWidget(renderReviewer(this)),
        ]);

        appendChildren(formElement, [header, shell, this.addWidget(renderActionBar(this))]);
        return formElement;
    }

    /** The sections above the unit tabs (contacts, deficiencies, time on site), sorted by `order`. */
    renderTopSections() {
        const sections = [...(this.config.sections || [])];
        sections.sort((a, b) => (a.order || 0) - (b.order || 0));
        return sections.map(section => this.addWidget(renderSection(this, section)));
    }

    /**
     * Remember a widget so refresh() can update it, and return its element for the page.
     * @param {{ element: HTMLElement, refresh?: Function } | null} widget
     */
    addWidget(widget) {
        if (!widget) return null;
        this.widgets.push(widget);
        return widget.element;
    }

    /** Called by createField() for every field. Stores the field and its starting value(s). */
    registerField(field) {
        this.fields.push(field);

        for (const [name, defaultValue] of Object.entries(field.getDefaultValues())) {
            this.fieldsByName.set(name, field);
            if (!(name in this.values)) this.values[name] = defaultValue;
        }
    }

    // ══════════════════════════════ Values ══════════════════════════════

    getValue(name) {
        return this.values[name];
    }

    /**
     * Change a value and update the screen.
     * @param {string} name
     * @param {*} value
     * @param {{ notify?: boolean }} [options]  notify: false skips the onFieldChange callback
     */
    setValue(name, value, { notify = true } = {}) {
        this.values[name] = value;
        if (notify) this.callbacks.onFieldChange?.(name, value, this.getField(name)?.config || null, this);
        this.refresh();
    }

    /** Update everything on screen from `this.values`. */
    refresh() {
        if (!this.formElement) return;

        // Step 1: calculated fields work out their numbers first, so steps 2 and 3 see fresh values.
        this.fields.forEach(field => field.recalculate());

        // Step 2: every field updates its own look (chips, selected buttons, tolerance bar...).
        this.fields.forEach(field => field.refresh());

        // Step 3: every widget updates the information it collects from many fields.
        this.widgets.forEach(widget => widget.refresh?.());
    }

    /** The field object that owns a value name (tolerance fields own two names). */
    getField(name) {
        return this.fieldsByName.get(name) || null;
    }

    /** Fields that are red or yellow, in page order. */
    getDeficientFields() {
        return this.fields.filter(field => field.isTracked() && field.isDeficient());
    }

    // ══════════════════════════════ Report status ══════════════════════════════

    getStatusFieldName() {
        return this.config.header?.status?.field || DEFAULT_STATUS_FIELD;
    }

    /** 'draft' | 'review' | 'approved' | 'rejected' */
    getReportStatus() {
        return this.values[this.getStatusFieldName()];
    }

    setReportStatus(status) {
        this.setValue(this.getStatusFieldName(), status);
    }

    // ══════════════════════════════ Units ══════════════════════════════

    getUnits() {
        return this.config.units?.items || [];
    }

    getFieldsOfUnit(unit) {
        return this.fields.filter(field => field.context.unit?.id === unit.id);
    }

    /** @returns {{ status: string, label: string, started: boolean }} */
    getUnitStatus(unit) {
        const hasNotes = unit.notes ? !isEmpty(this.getValue(unit.notes.name)) : false;
        return getUnitStatus(this.getFieldsOfUnit(unit), hasNotes);
    }

    /**
     * The unit's display name, e.g. "EF-1".
     * Taken from the identity field whose name contains "mark" (e.g. "u2Mark"), so the
     * technician can rename the unit. Falls back to the tab label.
     */
    getUnitMark(unit) {
        if (!unit) return '';
        const markField = unit.identity?.fields?.find(field => /mark/i.test(field.name || ''));
        const mark = markField ? this.getValue(markField.name) : '';
        return mark || unit.tabLabel || unit.id;
    }

    // ══════════════════════════════ Actions & navigation ══════════════════════════════

    /** Run a button action (timer, email, save, workflow, ...). See src/actions/index.js. */
    runAction(action, clickedButton = null) {
        return runAction(this, action, clickedButton);
    }

    /** Hand an action to the host page through the onAction callback. */
    emitAction(action) {
        this.callbacks.onAction?.(action, this.getData(), this);
    }

    /** Files picked for a field so far (empty array when none). */
    getAttachments(fieldName) {
        return this.attachments.get(fieldName) || [];
    }

    /** Store files picked for a field. Returns all files for that field so far. */
    addAttachments(fieldName, files) {
        const allFiles = [...(this.attachments.get(fieldName) || []), ...files];
        this.attachments.set(fieldName, allFiles);
        return allFiles;
    }

    /** Open the right tab and section, scroll to the field and flash it. Used by "View" in the deficiency list. */
    jumpToField(field) {
        if (field.context.unit) this.unitTabs?.showUnit(field.context.unit.id);
        field.context.section?.open();

        if (!field.element) return;
        // Wait one moment so the tab/section is visible before scrolling.
        setTimeout(() => {
            field.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            field.element.classList.add('dfr-highlight');
            setTimeout(() => field.element.classList.remove('dfr-highlight'), 1400);
        }, 80);
    }

    /** The id given to a field's input, unique per form: "accurexStartupReport__leadName". */
    controlId(name) {
        return `${this.config.id}__${name}`;
    }

    // ══════════════════════════════ Output ══════════════════════════════

    /** Everything the host page or CRM needs to save the report. */
    getData() {
        const attachments = {};
        this.attachments.forEach((files, fieldName) => {
            attachments[fieldName] = files.map(file => ({ name: file.name, type: file.type, size: file.size }));
        });

        return {
            formId: this.config.id,
            version: this.config.version,
            reportStatus: this.getReportStatus(),
            values: { ...this.values },
            attachments,
            units: this.getUnits().map(unit => ({
                id: unit.id,
                mark: this.getUnitMark(unit),
                status: this.getUnitStatus(unit),
            })),
        };
    }

    /**
     * Send getData() to `config.submission.url`.
     *
     * In offline mode, when the report cannot be sent right now (no connection, or the server
     * is temporarily down), it is saved in the outbox and sent automatically later.
     *
     * @returns {Promise<object|null|{ queued: true }>}
     *   the server's JSON answer (or null), or { queued: true } when it will be sent later
     */
    async submit() {
        const submission = this.config.submission;
        if (!submission) return undefined;

        const data = this.getData();
        const request = buildSubmitRequest(submission, data);
        const submittedAt = new Date().toISOString();

        // Known to be offline: don't even try, go straight to the outbox.
        if (this.offlineSync && !navigator.onLine) return this.queueSubmission(request, data);

        try {
            const responseData = await sendRequest(request);
            await this.clearDraftAfterSubmit(submittedAt); // the CRM has the report now
            this.callbacks.onSubmitSuccess?.(responseData, this);
            return responseData;
        } catch (error) {
            if (this.offlineSync && isTemporaryFailure(error)) return this.queueSubmission(request, data);

            this.callbacks.onSubmitError?.(error, this);
            throw error;
        }
    }

    /** Put a report in the outbox; OfflineSync sends it when it can. */
    async queueSubmission(request, data) {
        try {
            await this.offlineSync.queue(request);
        } catch (error) {
            // Could not even store it (e.g. device storage full): report it like a failed submit.
            this.callbacks.onSubmitError?.(error, this);
            throw error;
        }
        this.callbacks.onSubmitQueued?.(data, this);
        return { queued: true };
    }

    /** Send waiting offline reports now (also happens automatically when autoSync is on). */
    syncNow() {
        return this.offlineSync?.syncNow();
    }

    /** Stop timers and background syncing, and remove the form from the page. */
    destroy() {
        this.stopBackgroundWork();
        this.container.replaceChildren();
        this.formElement = null;
    }

    /** Stop everything that runs on its own: site timers and offline syncing. */
    stopBackgroundWork() {
        this.timers?.forEach(intervalId => clearInterval(intervalId));
        this.timers?.clear();
        this.offlineSync?.stop();
    }
}
