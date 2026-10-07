# Accurex Dynamic Form

Business users configure a form in the CRM. The CRM API returns that configuration as JSON, and this package draws the form on the corporate website. You don't write any HTML per form.

```
CRM (form config) ──► API (JSON) ──► DynamicFormRenderer ──► form on the website
```

## Use it on a page

```html
<link rel="stylesheet" href="Accurex-dynamic-form.css">
<script type="module" src="Accurex-DynamicFormRenderer.js"></script>

<div id="formHost"></div>
<script>
  document.addEventListener('DOMContentLoaded', async () => {
    const form = new DynamicFormRenderer({
      container: '#formHost',
      configUrl: '/api/forms/startup-report',          // CRM API
      onWorkflow: (action, data, form) => form.submit(),   // send to the CRM
    });
    await form.render();
  });
</script>
```

The page must be served over `http(s)://`, not opened as `file://`. To run the sample locally, use the small development server. It serves the files and also stands in for the CRM's `POST /api/startup-report`, so the Submit, Approve and Reject buttons work end to end:

```bash
python3 dev-server.py
```

Then open http://localhost:8080/sample.html. Each received report is printed in the terminal.

The full developer documentation (tutorials, config and API reference, guides) is at http://localhost:8080/docs/ while the dev server runs.

### Public API

| Call | What it does |
|---|---|
| `new DynamicFormRenderer(options)` | `container`, `configUrl` or `config`, plus optional callbacks (below) |
| `await form.render()` | Load the JSON and draw the form |
| `form.getData()` | All values, attachments and unit statuses |
| `await form.submit()` | POST `getData()` to `config.submission.url`. Offline, it returns `{ queued: true }` and sends later |
| `form.syncNow()` | Send waiting offline reports now (normally automatic) |
| `form.discardDraft()` | Delete the saved draft and rebuild the form |
| `form.destroy()` | Stop timers and background syncing, remove the form |

Options: `restoreDraft` (default `true`) puts back values saved with "Save draft" on this device.
Callbacks: `onFieldChange`, `onWorkflow`, `onDataPull`, `onAction`, `onSubmitSuccess`, `onSubmitError`, `onSubmitQueued`.
Their parameters are documented in `src/DynamicFormRenderer.js`.

## Live demo (GitHub Pages)

Every push to `main` runs [.github/workflows/pages.yml](.github/workflows/pages.yml):

1. **Check:** every `.js` file must parse, every `.json` file must be valid, and `dev-server.py` must compile. Pull requests run this step only.
2. **Build:** copy only the files the website needs into `_site/`. `dev-server.py`, this README and `.github/` are not published.
3. **Deploy:** publish `_site/` to GitHub Pages.

Links to share:

| What | URL |
|---|---|
| Landing page | https://ghchetan.github.io/dynamic-form/ |
| Form demo | https://ghchetan.github.io/dynamic-form/sample.html |
| Documentation | https://ghchetan.github.io/dynamic-form/docs/ |

**One-time setup:** in **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**. GitHub Pages needs the repo to be public on the Free plan.

**Demo mode.** GitHub Pages can only serve files, so there is no CRM to send reports to. When `sample.html` runs anywhere other than `localhost`, it switches to demo mode:

- a banner says nothing is sent
- Submit, Approve and Reject pretend the CRM accepted the report
- "Pull from CAPS" fills in demo values

Add `?demo` to the URL to try demo mode locally. Production pages don't use `sample.html`, so they are not affected.

## How the code works (5-minute tour)

Start reading at **`src/DynamicFormRenderer.js`**. The comment at the top explains the whole flow:

```
user input → form.setValue() → form.values → form.refresh() → screen
```

- **One place for data.** Every value lives in `form.values` (field name → value).
- **Fields** (`src/fields/`) are classes. Each one draws itself (`render()`) and updates itself (`refresh()`).
- **Sections** (`src/sections/`) are functions that return `{ element, refresh }`.
- **After any change**, `refresh()` runs on every field and section. Nothing updates itself in a hidden way.

```
index.html                       Landing page of the hosted demo (links to the demo and the docs)
Accurex-DynamicFormRenderer.js   Entry point (load this on the page)
dev-server.py                    Local server for the sample (also fakes the CRM submit API)
docs/index.html                  Developer documentation portal (Cmd+K search); open via the dev server at /docs/
.github/workflows/pages.yml      Checks the code and deploys the site to GitHub Pages on every push to main
service-worker.js                Stores the page's files so it opens offline
Accurex-dynamic-form.css         Styles (all classes start with "dfr-")
src/
  DynamicFormRenderer.js         The main class: builds the form, holds values, refreshes the screen
  constants.js                   Status names (green/yellow/red/gray, pass/caution/fail/pending)
  core/
    loadConfig.js                Download the JSON (falls back to the offline copy)
    http.js                      sendRequest(), "is this failure temporary?"
    layout.js                    config.layout → CSS variables (max width, columns)
    status.js                    Progress "3/7", unit status, deficiency text (pure functions)
  offline/
    settings.js                  Reads config.behavior.offline
    database.js                  Tiny async wrapper around IndexedDB
    draftStores.js               Draft storage: localStorage or IndexedDB (with photos)
    outbox.js                    Reports waiting to be sent
    OfflineSync.js               Sends the outbox when the connection is back
    configCopy.js                Offline copy of the form configuration
    serviceWorkerSetup.js        Registers service-worker.js and tells it which files to store
  evaluators/index.js            Rules that decide pass / check / fail
  fields/
    index.js                     Field registry: JSON "type" → class
    BaseField.js                 Parent class with the shared behaviour (read this first)
    InputField.js                text, email, number, date, textarea
    SelectField.js               dropdown
    CheckboxField.js             tick box
    CalculatedField.js           read-only formula, e.g. "{actualHours} - {expectedHours}"
    SegmentedField.js            [ Yes | No | N/A ] buttons
    ToleranceField.js            reading vs. reference with a coloured bar
    attachmentPicker.js          "Attach photo" button
  sections/
    index.js                     Section registry: JSON "type" → function
    header.js                    Dark top bar, status pill, metrics
    cardSection.js               Default card with a 2-column grid
    deficiencySummary.js         Red/green list of flagged fields
    hoursTracker.js              Time on site + timer
    units.js                     Unit tabs and unit panels
    accordion.js                 Collapsible section inside a unit
    summaryPanel.js              Summary tab
    equipmentSummary.js          Per-unit status on the Summary tab
    reviewer.js                  Approve / Reject card
    actionBar.js                 Buttons fixed to the bottom
    draftBanner.js               "Draft restored · Discard draft" message
    syncStatus.js                "You're offline · 1 report waiting · Send now" bar
  actions/
    index.js                     Action registry: JSON "type" → function
    timerAction.js  emailAction.js  saveDraftAction.js  workflowAction.js  dataPullAction.js
  utils/
    dom.js                       el() and button() helpers (never innerHTML)
    format.js  template.js
    formula.js                   Safe formulas ("{a} - {b}") and conditions ("value > b * 0.25")
```

## Extending it

Each kind of building block has a **registry**: a plain object that maps the `type` written in the JSON to the code that handles it. To add a new kind, you write one file and add one line to the registry.

| You want to add… | Write | Register in |
|---|---|---|
| A field type (e.g. `signature`) | a class that `extends BaseField` | `FIELD_TYPES` in `src/fields/index.js` |
| A section type | a function returning `{ element, refresh }` | `SECTION_TYPES` in `src/sections/index.js` |
| A button action | a function `(form, action, button)` | `ACTION_HANDLERS` in `src/actions/index.js` |
| A pass/fail rule | a function `(rule, input) → 'green' \| 'yellow' \| 'red' \| 'gray'` | `EVALUATORS` in `src/evaluators/index.js` |

Example: a new field type.

```js
// src/fields/RatingField.js
import { el } from '../utils/dom.js';
import { BaseField } from './BaseField.js';

export class RatingField extends BaseField {
    renderControl() {
        this.control = el('input', { attrs: { type: 'range', min: 1, max: 5 } });
        this.applyStandardAttributes(this.control);
        this.control.value = this.value || 3;
        this.control.addEventListener('input', () => this.form.setValue(this.name, this.control.value));
        return this.control;
    }
}

// src/fields/index.js
//   rating: RatingField,
```

A website can also register its own types without editing this package, because the registries are exported:

```js
import { FIELD_TYPES } from './Accurex-DynamicFormRenderer.js';
FIELD_TYPES.rating = RatingField;
```

## Rules that apply everywhere

- **Tracked fields.** Any field with an `evaluation` block counts towards progress ("3/7"). If its status is red or yellow, it appears in the deficiency list. This depends on the config, not on the field type.
- **"N/A" counts as answered.** It moves progress forward but is never a deficiency.
- **Never use `innerHTML` with config text.** Use `el()` from `src/utils/dom.js`, so CRM text can't inject HTML.

## Status rules

Any field can have `statusRules`. The first rule whose `when` is true sets the field's colour.
Inside `when`, `value` is this field's value, and any other word is the value of the field with that name.
For a status you can write `pass`/`caution`/`fail` or `green`/`yellow`/`red`.

```json
"statusRules": [
  { "when": "value <= 0", "status": "pass" },
  { "when": "value > 0 && value <= expectedHours * 0.25", "status": "caution" },
  { "when": "value > expectedHours * 0.25", "status": "fail" }
]
```

Conditions may only use numbers, field names and `+ - * / ( ) < > <= >= == != && ||`. Anything else is rejected.
Status rules only colour a field. They don't add it to progress counts or the deficiency list; only `evaluation` does that.

## Drafts

"Save draft" stores the form on this device.
The next time the form opens on the same device, the draft is put back and a banner offers **Discard draft**.

- With offline mode (below), drafts go into IndexedDB **including photos**. Without it, they go into `localStorage` (key `DynamicFormRenderer:<formId>`) without photos.
- Values for fields that are no longer in the config are ignored.
- When a report reaches the CRM, the draft is deleted, unless the draft was saved after that report was made.
- To turn restoring off, pass `restoreDraft: false`.

## Offline mode

Switch it on in the config:

```json
"behavior": { "offline": { "enabled": true, "storage": "indexedDB", "autoSync": true } }
```

| What | How it works |
|---|---|
| Drafts | Kept in IndexedDB (database `AccurexDynamicForms`, store `drafts`), photos included |
| `form.submit()` without a connection | The report goes into the **outbox** (store `outbox`), `onSubmitQueued` is called, and `submit()` returns `{ queued: true }` |
| Auto-sync | The outbox is sent when the page opens, when the browser reports it is back online, and every 30 s while reports are waiting. Reports are sent oldest first. `onSubmitSuccess` is called for each one. |
| Server down (408, 429, 500, 502–504) or no network | Treated as temporary: the report stays in the outbox and is retried |
| Server refuses (any other error, e.g. 400) | Not retried. The report is kept and marked `failed`, `onSubmitError` is called, and the status bar asks the user to contact support |
| Several tabs open | A Web Lock makes sure only one tab sends the outbox, so a report is never sent twice |
| Opening the form with no connection | The service worker serves the page's files, and the last downloaded config is kept (store `configs`) and used when the CRM can't be reached. See below. |
| Status bar | Shows "You're offline", "N reports waiting to be sent" with a **Send now** button, or the failed count |

Set `"autoSync": false` to send only when the page calls `form.syncNow()`.

Workflow buttons ("Submit for review", "Approve", "Reject") send the report through `onWorkflow`. The sample does this:

```js
onWorkflow: (action, data, form) => form.submit()
```

If `onWorkflow` throws (for example the CRM refuses the report), the previous report status is put back. While it runs, the button is disabled, so a double-click can't send the report twice. A report queued while offline counts as success: the status stays changed, and the report is sent later.

### Opening the page offline (service worker)

Pass `serviceWorkerUrl` and keep offline mode on in the config:

```js
new DynamicFormRenderer({ container: '#formHost', configUrl: '…', serviceWorkerUrl: 'service-worker.js' });
```

| Stored by | What |
|---|---|
| Service worker (`service-worker.js`) | The page's **files**: HTML, CSS, JavaScript, images |
| IndexedDB (`src/offline/`) | The **data**: drafts, photos, outbox, form config |

- **Which files.** After the page loads, it sends the service worker the list of files it just used, and only those are stored. Requests made by code (API calls, the config JSON) are data and are left out. There is no file list to maintain: a new file in `src/` is stored automatically.
- **Network first.** When online, every stored file is checked with the server and the stored copy is updated, so a release reaches users straight away. The check skips the browser's own HTTP cache, so loose cache headers on the website can't serve stale code. If the network doesn't answer within 4 seconds, or there's no connection, the stored copy is used.
- **Never-visited pages.** Opened offline, they show a short "You're offline" message.
- **Wiping stored files.** Change `CACHE_NAME` in `service-worker.js` to delete the stored files on every device.

**Requirements**
- The page must be on `https://` (or `http://localhost` for development).
- **Scope:** a service worker only controls pages in its own folder and below. Put `service-worker.js` in the same folder as the form page, or a higher one. If it has to live deeper (e.g. `/assets/accurex/`), the server must send `Service-Worker-Allowed: /` with that file.
- The page must be opened once with a connection before it works offline.

**Limits.** Photos are kept in drafts, but `submit()` still sends JSON (photo names and sizes only), because `config.submission` is a JSON endpoint.

## Layout

```json
"layout": { "maxWidth": 640, "columns": 2 }
```

- `maxWidth`: how wide the form may get. A number means pixels; a CSS length such as `"48rem"` or `"100%"` is also accepted.
- `columns`: how many columns the field grids have.

A field can take more than one column with `layout.columnSpan` on the field:

| `columnSpan` | Width |
|---|---|
| not set | 1 column |
| `2`, `3`, … | that many columns, reduced to `columns` if larger |
| `"full"` | the whole row, whatever `columns` is |

```json
{ "name": "servicerEmail", "type": "email", "layout": { "columnSpan": "full" } }
```

Use `"full"` for fields that should always fill the row, such as long emails or notes, so they still fit if `columns` changes later.
- On phones (520px wide or less), every grid shows one column, whatever `columns` says.
- Invalid values fall back to 640px and 2 columns, with a warning in the console.
- `labelPosition` only supports `"top"`, which is what the form always does. `mode` is informational.

The JavaScript only sets two CSS variables on the form, `--dfr-max-width` and `--dfr-columns`. All sizing stays in the CSS file.
