/**
 * The tutorial videos, as data. Edit the words or the actions here, then run:  node video/build.mjs
 *
 * An episode is a list of scenes. Each scene opens one page and plays its steps in order:
 *
 *   {
 *     title: 'Shown in the chapter list under the video',
 *     page: 'docs/code-guide.html#fields',          // or card({ … }) for a title card
 *     steps: [
 *       {
 *         say: 'What the narrator says.',            // spoken by the text-to-speech voice
 *         caption: 'Optional: captions, if they should be spelled differently from "say"',
 *         do: async t => { … },                       // what happens on screen while it's said
 *       },
 *     ],
 *   }
 *
 * A step lasts as long as its narration (or its actions, if they take longer).
 * The toolkit `t` is described in build.mjs (scrollTo, spotlight, click, type, console, …).
 */

/** A title or end card page. */
const card = ({ kicker = '', title = '', subtitle = '' }) =>
    'video/card.html?' + new URLSearchParams({ kicker, title, subtitle });

const GUIDE = 'docs/code-guide.html';
const DEMO = 'sample.html?demo';
const excerpt = (file, start) => `figure.excerpt[data-file="${file}"][data-start="${start}"]`;
const field = name => `[data-field-name="${name}"]`;
const answer = (name, value) => `${field(name)} .dfr-seg-btn[data-value="${value}"]`;

// ── Debugger walkthroughs (episodes 6–10) ──
// Without ?demo, sample.html on localhost really calls form.submit(), so the real submit code runs.
// The CRM's answer is faked in the browser with Playwright, so no product code changes.
const LIVE = 'sample.html';
const SUBMIT = '[data-action-id="submitForReview"]';
const SAVE = '[data-action-id="saveDraft"]';
const DEBUG_SERIES = 'Debugger walkthroughs';

/** Make POST /api/startup-report answer with this HTTP status (a scene's or debug spec's `setup`). */
const crmAnswers = status => async ({ context }) => {
    const body = status < 300
        ? { ok: true, receivedAt: '2026-10-09T09:30:00.000Z', reportStatus: 'review' }
        : { error: status === 400 ? 'Report is missing required data' : 'Server error' };
    await context.route('**/api/startup-report', route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }));
};

/** A debugger walkthrough's title card. */
const debugCard = (number, title, subtitle) => card({ kicker: `Debugger walkthrough · Episode ${number}`, title, subtitle });

/** Every walkthrough ends the same way. */
const debugEnd = number => ({
    title: 'Try it yourself',
    page: card({ kicker: `End of episode ${number}`, title: 'Try it in DevTools', subtitle: 'Open sample.html, press F12, and set the same breakpoints in the Sources panel.' }),
    steps: [{ say: 'To try this yourself, open sample dot H T M L, open DevTools, and set the same breakpoints in the Sources panel. Then do what we did, and step through it.', caption: 'To try this yourself, open sample.html, open DevTools, and set the same breakpoints in the Sources panel. Then do what we did, and step through it.' }],
});

export const EPISODES = [
    // ═══════════════════════════════════════ 1 ═══════════════════════════════════════
    {
        number: 1,
        series: 'Code tour',
        title: 'What it is, and how to run it',
        summary: 'What the project does, a tour of the demo, and how to run it on your own machine.',
        scenes: [
            {
                title: 'Welcome',
                page: card({ kicker: 'Code tour · Episode 1', title: 'What it is, and how to run it', subtitle: 'For new developers. About three minutes.' }),
                steps: [
                    { say: 'Welcome to the Accurex Dynamic Form code tour. This is episode one. By the end of it, you will know what this project does, how to run it, and what happens when the page loads.' },
                ],
            },
            {
                title: 'The idea',
                page: 'index.html',
                steps: [
                    {
                        say: 'Here is the idea in one sentence. Business users design a form in the C R M. The C R M sends that design as JSON. And this code turns the JSON into a working form on the website. Nobody writes HTML for a form.',
                        caption: 'Here is the idea in one sentence. Business users design a form in the CRM. The CRM sends that design as JSON. And this code turns the JSON into a working form on the website. Nobody writes HTML for a form.',
                        do: async t => { await t.wait(1); await t.spotlight('header'); },
                    },
                    {
                        say: 'Our example is the Accurex Start-Up Report. Technicians fill it in on site when they commission kitchen ventilation equipment: control panels, hoods, exhaust fans and make-up air units.',
                        do: async t => { await t.spotlight('a.card[href="sample.html"]'); await t.wait(5); await t.click('a.card[href="sample.html"]'); },
                    },
                ],
            },
            {
                title: 'A quick tour of the demo',
                page: DEMO,
                steps: [
                    {
                        say: 'This whole page was drawn from one JSON file. The header shows the job and the report status. Each piece of equipment gets a tab: C P 1, H D 1, E F 1 and M U A 1.',
                        caption: 'This whole page was drawn from one JSON file. The header shows the job and the report status. Each piece of equipment gets a tab: CP-1, HD-1, EF-1 and MUA-1.',
                        do: async t => {
                            await t.spotlight('.dfr-header');
                            await t.wait(4);
                            await t.scrollTo('.dfr-unit-tabs');
                            await t.spotlight('.dfr-unit-tabs');
                        },
                    },
                    {
                        say: 'Let’s answer a question. On the control panel: power to lights? No.',
                        do: async t => { await t.scrollTo(field('u4LightsPower')); await t.click(answer('u4LightsPower', 'No')); },
                    },
                    {
                        say: 'Watch what happens. The question is flagged. The section counter turns red. And the tab gets a red dot.',
                        do: async t => {
                            await t.spotlight(`${field('u4LightsPower')} .dfr-chip`);
                            await t.wait(1.8);
                            await t.scrollTo('[data-section-id="u4Panel"]');
                            await t.spotlight('[data-section-id="u4Panel"] .dfr-section-chip');
                            await t.wait(1.8);
                            await t.scrollTo('.dfr-unit-tabs');
                            await t.spotlight('.dfr-unit-tab .dfr-flagdot');
                        },
                    },
                    {
                        say: 'Every problem is also listed in one place, near the top, with a View link that jumps straight back to it.',
                        do: async t => {
                            await t.scrollTo('.dfr-deficiency');
                            await t.spotlight('.dfr-deficiency');
                            await t.wait(3);
                            await t.click('.dfr-def-item .dfr-link-btn');
                        },
                    },
                    {
                        say: 'Now a measured reading. The nameplate says eighteen point two amps, and the overload is set to nineteen point five. That is seven percent off, so the form says: check.',
                        do: async t => {
                            await t.scrollTo('[data-section-id="u4Overload"]');
                            await t.click('[data-section-id="u4Overload"] .dfr-accordion-head');
                            await t.type('#accurexStartupReport__u4OverloadReference', '18.2');
                            await t.type('#accurexStartupReport__u4OverloadReading', '19.5');
                            await t.spotlight([`${field('u4Overload')} .dfr-tolerance`, `${field('u4Overload')} .dfr-chip`]);
                        },
                    },
                ],
            },
            {
                title: 'Run it yourself',
                page: GUIDE + '#before-you-start',
                steps: [
                    {
                        say: 'To run it yourself, clone the repository and start the development server: python three, dev server dot p y. Then open sample dot H T M L on localhost, port eight thousand and eighty.',
                        caption: 'To run it yourself, clone the repository and start the development server: python3 dev-server.py. Then open sample.html on localhost, port 8080.',
                        do: async t => { await t.scrollTo('#before-you-start pre.code'); await t.spotlight('#before-you-start pre.code'); },
                    },
                    {
                        say: 'There is no npm, no build step and no framework. The browser runs the files exactly as they are written.',
                    },
                ],
            },
            {
                title: 'The big picture',
                page: GUIDE + '#big-picture',
                steps: [
                    {
                        say: 'There are three layers. The configuration says what to ask. The framework, in the source folder, does the work. And the host page says where to draw the form.',
                        caption: 'There are three layers. The configuration says what to ask. The framework, in the src folder, does the work. And the host page says where to draw the form.',
                        do: async t => { await t.scrollTo('.layers'); await t.spotlight('.layers'); },
                    },
                    {
                        say: 'When the page loads, render downloads the JSON, builds every block of the page, puts back any saved draft, and calls refresh, which draws the current state.',
                        do: async t => { await t.scrollTo('.sequence'); await t.spotlight('.sequence'); },
                    },
                ],
            },
            {
                title: 'Next',
                page: card({ kicker: 'Next · Episode 2', title: 'Folders and the main loop', subtitle: 'The one loop that explains the whole codebase.' }),
                steps: [
                    { say: 'In the next episode, we open the folders, and meet the one loop that explains the whole codebase: set value, then refresh.' },
                ],
            },
        ],
    },

    // ═══════════════════════════════════════ 2 ═══════════════════════════════════════
    {
        number: 2,
        series: 'Code tour',
        title: 'Folders and the main loop',
        summary: 'What each folder is for, and the setValue → refresh loop at the heart of the code.',
        scenes: [
            {
                title: 'Welcome',
                page: card({ kicker: 'Code tour · Episode 2', title: 'Folders and the main loop', subtitle: 'The most important episode in the series.' }),
                steps: [{ say: 'Episode two: the folders, and the main loop. If you only watch one episode, make it this one.' }],
            },
            {
                title: 'One question per folder',
                page: GUIDE + '#folder-structure',
                steps: [
                    {
                        say: 'Every folder answers one question. Fields: how is one question drawn? Sections: how is a block of the page drawn? Actions: what does a button do? Evaluators: is an answer OK? And offline: how does it keep working without a network?',
                        do: async t => { await t.scrollTo('#folder-structure .table-wrap'); await t.spotlight('#folder-structure .table-wrap'); },
                    },
                    {
                        say: 'Here is every file, with what it does and how long it is. Most files are under seventy lines, so you can read any of them in a few minutes. Base Field is the one to read first.',
                        caption: 'Here is every file, with what it does and how long it is. Most files are under seventy lines, so you can read any of them in a few minutes. BaseField is the one to read first.',
                        do: async t => {
                            await t.scrollTo('li:has(> code[data-path="src/fields/index.js"])');
                            await t.spotlight('#fileTree li:has(> ul > li > code[data-path="src/fields/BaseField.js"]) > ul');
                            await t.wait(4);
                            await t.spotlight('li:has(> code[data-path="src/fields/BaseField.js"])');
                        },
                    },
                    {
                        say: 'This table is built from the real import lines. Utils imports nothing, and fields know nothing about sections or buttons. That keeps every part easy to understand on its own.',
                        do: async t => {
                            await t.scrollTo('table.imports');
                            await t.spotlightRow('#importTable', 'src/utils/');
                            await t.wait(3);
                            await t.spotlightRow('#importTable', 'src/fields/');
                        },
                    },
                ],
            },
            {
                title: 'The main loop',
                page: GUIDE + '#flow-answer',
                steps: [
                    {
                        say: 'Now the main loop. When a technician taps a button, the field calls set value on the form. That is the only way a value ever changes.',
                        caption: 'Now the main loop. When a technician taps a button, the field calls setValue on the form. That is the only way a value ever changes.',
                        do: async t => { await t.scrollTo('#flow-answer'); await t.spotlight('[data-flow="answer"] .seq-scroll'); },
                    },
                    {
                        say: 'Set value stores the answer in one object, form dot values. Then it calls refresh, which asks every field, and then every widget, to redraw itself from those values.',
                        caption: 'setValue stores the answer in one object, form.values. Then it calls refresh, which asks every field, and then every widget, to redraw itself from those values.',
                        do: async t => { await t.scrollBy(260); await t.spotlight('[data-flow="answer"] .seq-scroll'); },
                    },
                    { say: 'That’s it. One place for data, and one way to update the screen. When something looks wrong, there is exactly one place to look.' },
                ],
            },
            {
                title: 'refresh() in the real code',
                page: GUIDE + '#main-class',
                steps: [
                    {
                        say: 'Here is refresh in the real code. Step one: calculated fields work out their numbers. Step two: every field updates its own look. Step three: every widget updates what it collects from many fields.',
                        do: async t => {
                            await t.scrollTo(excerpt('src/DynamicFormRenderer.js', '    refresh() {'));
                            await t.spotlight(excerpt('src/DynamicFormRenderer.js', '    refresh() {'));
                        },
                    },
                ],
            },
            {
                title: 'Try it in the console',
                page: DEMO,
                steps: [
                    {
                        say: 'You can see this for yourself. The sample page puts the form on window dot form renderer. In the browser console, type form renderer dot values.',
                        caption: 'You can see this for yourself. The sample page puts the form on window.formRenderer. In the browser console, type formRenderer.values.',
                        do: async t => { await t.scrollTo('.dfr-unit-tabs'); await t.console('formRenderer.values.reportStatus'); },
                    },
                    {
                        say: 'Calling set value from the console does exactly what a tap does. Watch the first tab change its name.',
                        caption: 'Calling setValue from the console does exactly what a tap does. Watch the first tab change its name.',
                        do: async t => { await t.console("formRenderer.setValue('u4Mark', 'CP-9')"); await t.spotlight('.dfr-unit-tab'); },
                    },
                ],
            },
            {
                title: 'Next',
                page: card({ kicker: 'Next · Episode 3', title: 'Fields and rules', subtitle: 'How one question is drawn, and judged.' }),
                steps: [{ say: 'Next time: fields and rules. How one question is drawn, and how the form decides whether the answer is OK.' }],
            },
        ],
    },

    // ═══════════════════════════════════════ 3 ═══════════════════════════════════════
    {
        number: 3,
        series: 'Code tour',
        title: 'Fields and rules',
        summary: 'Field classes, the registry pattern, BaseField, and how answers become green, yellow or red.',
        scenes: [
            {
                title: 'Welcome',
                page: card({ kicker: 'Code tour · Episode 3', title: 'Fields and rules', subtitle: 'How one question is drawn, and judged.' }),
                steps: [{ say: 'Episode three: fields and rules.' }],
            },
            {
                title: 'The field registry',
                page: GUIDE + '#fields',
                steps: [
                    {
                        say: 'Every question in the form is a field object. The type in the JSON picks its class, using a registry: a plain object that maps a name to the code that handles it. To add a new kind of question, you add one line here.',
                        do: async t => { await t.scrollTo(excerpt('src/fields/index.js', 'export const FIELD_TYPES = {')); await t.spotlight(excerpt('src/fields/index.js', 'export const FIELD_TYPES = {')); },
                    },
                    {
                        say: 'If the C R M sends a type nobody knows, the form shows a plain text box and warns in the console. A typo never breaks the whole page.',
                        caption: 'If the CRM sends a type nobody knows, the form shows a plain text box and warns in the console. A typo never breaks the whole page.',
                        do: async t => { await t.scrollTo(excerpt('src/fields/index.js', 'export function createField(')); await t.spotlight(excerpt('src/fields/index.js', 'export function createField(')); },
                    },
                ],
            },
            {
                title: 'BaseField',
                page: GUIDE + '#fields',
                steps: [
                    {
                        say: 'All field classes share one parent: Base Field. Its render method fixes the order of the parts: the label, the help text, the input, and the photo button. Each field type replaces only the parts that are different.',
                        caption: 'All field classes share one parent: BaseField. Its render method fixes the order of the parts: the label, the help text, the input, and the photo button. Each field type replaces only the parts that are different.',
                        do: async t => { await t.scrollTo(excerpt('src/fields/BaseField.js', '    render() {')); await t.spotlight(excerpt('src/fields/BaseField.js', '    render() {')); },
                    },
                ],
            },
            {
                title: 'A complete field type',
                page: GUIDE + '#fields',
                steps: [
                    {
                        say: 'Here is a complete field type: the yes, no, N A buttons. Each button just calls set value. It never changes its own colour.',
                        caption: 'Here is a complete field type: the Yes / No / N/A buttons. Each button just calls setValue. It never changes its own colour.',
                        do: async t => { await t.scrollTo(excerpt('src/fields/SegmentedField.js', 'export class SegmentedField extends BaseField {')); await t.scrollBy(320); },
                    },
                    {
                        say: 'Its refresh method does that, after every change, by checking which answer is selected and what its status is.',
                        do: async t => { await t.click(excerpt('src/fields/SegmentedField.js', 'export class SegmentedField extends BaseField {') + ' .expand'); await t.scrollBy(420); },
                    },
                ],
            },
            {
                title: 'Rules and roll-ups',
                page: GUIDE + '#rules',
                steps: [
                    {
                        say: 'So how does the form decide that No is red? A question can have an evaluation rule in the JSON. The rule’s type picks a function. Expected value, for example, passes when the answer equals the expected answer.',
                        caption: 'So how does the form decide that No is red? A question can have an evaluation rule in the JSON. The rule’s type picks a function. expectedValue, for example, passes when the answer equals the expected answer.',
                        do: async t => { await t.scrollTo(excerpt('src/evaluators/index.js', '    expectedValue(rule, value) {')); await t.spotlight(excerpt('src/evaluators/index.js', '    expectedValue(rule, value) {')); },
                    },
                    {
                        say: 'Then small functions, with no page code at all, roll the answers up. A unit is red if any answer is red, and green only when everything is answered and nothing failed.',
                        do: async t => { await t.scrollTo(excerpt('src/core/status.js', 'export function getUnitStatus(fields, hasNotes) {')); await t.spotlight(excerpt('src/core/status.js', 'export function getUnitStatus(fields, hasNotes) {')); },
                    },
                ],
            },
            {
                title: 'The three outcomes',
                page: DEMO,
                steps: [
                    {
                        say: 'Let’s see the three outcomes. Yes passes.',
                        do: async t => { await t.scrollTo(field('u4ControlPower')); await t.click(answer('u4ControlPower', 'Yes')); await t.spotlight(`${field('u4ControlPower')} .dfr-chip`); },
                    },
                    {
                        say: 'No is flagged.',
                        do: async t => { await t.click(answer('u4LightsPower', 'No')); await t.spotlight(`${field('u4LightsPower')} .dfr-chip`); },
                    },
                    {
                        say: 'And N A is a valid answer, with no colour. All three count towards the section’s progress.',
                        caption: 'And N/A is a valid answer, with no colour. All three count towards the section’s progress.',
                        do: async t => {
                            await t.click(answer('u4FireSystem', 'N/A'));
                            await t.spotlight(`${field('u4FireSystem')} .dfr-chip`);
                            await t.wait(2.5);
                            await t.scrollTo('[data-section-id="u4Panel"]');
                            await t.spotlight('[data-section-id="u4Panel"] .dfr-section-chip');
                        },
                    },
                ],
            },
            {
                title: 'Next',
                page: card({ kicker: 'Next · Episode 4', title: 'Sections, widgets and buttons', subtitle: 'Blocks of the page, and what buttons do.' }),
                steps: [{ say: 'Next: sections, widgets and buttons.' }],
            },
        ],
    },

    // ═══════════════════════════════════════ 4 ═══════════════════════════════════════
    {
        number: 4,
        series: 'Code tour',
        title: 'Sections, widgets and buttons',
        summary: 'Page blocks as widgets, closures, the action registry, and what happens on Submit and Reject.',
        scenes: [
            {
                title: 'Welcome',
                page: card({ kicker: 'Code tour · Episode 4', title: 'Sections, widgets and buttons', subtitle: 'Blocks of the page, and what buttons do.' }),
                steps: [{ say: 'Episode four: sections, widgets and buttons.' }],
            },
            {
                title: 'Widgets',
                page: GUIDE + '#sections',
                steps: [
                    {
                        say: 'Fields are classes. Blocks of the page, like the header, a card or the unit tabs, are plain functions. Each one returns an element to put on the page, and, if it shows live information, a refresh function. That small object is called a widget.',
                        do: async t => { await t.scrollTo('#sections pre.code'); await t.spotlight('#sections pre.code'); },
                    },
                    {
                        say: 'The accordion is a good example. Its refresh function updates the three out of seven counter. It still remembers its elements long after the outer function has returned. That is called a closure.',
                        do: async t => { await t.scrollTo(excerpt('src/sections/accordion.js', 'export function renderAccordion(form, section, unit) {')); await t.scrollBy(380); },
                    },
                ],
            },
            {
                title: 'The action registry',
                page: GUIDE + '#actions',
                steps: [
                    {
                        say: 'Buttons work the same way, with a third registry. The button’s type in the JSON picks its function: save, email, print, timer, workflow, or data pull. Any other type is handed to the website to handle.',
                        do: async t => { await t.scrollTo(excerpt('src/actions/index.js', 'export const ACTION_HANDLERS = {')); await t.spotlight(excerpt('src/actions/index.js', 'export const ACTION_HANDLERS = {')); },
                    },
                ],
            },
            {
                title: 'Submit for review',
                page: GUIDE + '#flow-submit',
                steps: [
                    {
                        say: 'Here is Submit for review. The status changes to review, and the website’s on workflow callback sends the report with form dot submit.',
                        caption: 'Here is Submit for review. The status changes to review, and the website’s onWorkflow callback sends the report with form.submit().',
                        do: async t => { await t.scrollTo('#flow-submit'); await t.spotlight('[data-flow="submit"] .seq-scroll'); },
                    },
                    {
                        say: 'If the C R M refuses the report, the status is put back, so the screen never says review for a report the C R M never received. And the button is disabled while it sends, so a double click can’t send it twice.',
                        caption: 'If the CRM refuses the report, the status is put back, so the screen never says review for a report the CRM never received. And the button is disabled while it sends, so a double click can’t send it twice.',
                        do: async t => { await t.scrollBy(300); await t.spotlight('[data-flow="submit"] .seq-group.alt'); },
                    },
                ],
            },
            {
                title: 'The reviewer',
                page: DEMO,
                steps: [
                    {
                        say: 'Let’s try the reviewer. Reject needs a note. Without one, the note box is outlined in red, and nothing is sent.',
                        do: async t => {
                            await t.scrollTo('.dfr-reviewer-toggle');
                            await t.click('.dfr-reviewer-toggle');
                            await t.scrollTo('.dfr-reviewer-card');
                            await t.click('.dfr-reviewer-actions button');
                            await t.spotlight('#accurexStartupReport__reviewerNote');
                        },
                    },
                    {
                        say: 'With a note, the report is rejected, the status at the top changes, and the banner shows the reason.',
                        do: async t => {
                            await t.clear();
                            await t.type('#accurexStartupReport__reviewerNote', 'Lights circuit needs a photo');
                            await t.click('.dfr-reviewer-actions button');
                            await t.wait(0.8);
                            await t.spotlight(['.dfr-decision-banner', '.dfr-reviewer-actions']);
                            await t.wait(2.5);
                            await t.spotlight('.dfr-status');
                        },
                    },
                ],
            },
            {
                title: 'Next',
                page: card({ kicker: 'Next · Episode 5', title: 'Working offline', subtitle: 'Drafts, the outbox, and the service worker.' }),
                steps: [{ say: 'In the last episode: how the form keeps working without a network.' }],
            },
        ],
    },

    // ═══════════════════════════════════════ 5 ═══════════════════════════════════════
    {
        number: 5,
        series: 'Code tour',
        title: 'Working offline',
        summary: 'Drafts in IndexedDB, the outbox and sync, the service worker, and where to go next.',
        scenes: [
            {
                title: 'Welcome',
                page: card({ kicker: 'Code tour · Episode 5', title: 'Working offline', subtitle: 'Drafts, the outbox, and the service worker.' }),
                steps: [{ say: 'Episode five: working offline.' }],
            },
            {
                title: 'Three browser features',
                page: GUIDE + '#offline',
                steps: [
                    {
                        say: 'Technicians often work in basements with no signal, so the form keeps working offline. Three browser features make that possible: Indexed D B stores the data, local storage is a simple fallback for drafts, and a service worker stores the page’s files.',
                        caption: 'Technicians often work in basements with no signal, so the form keeps working offline. Three browser features make that possible: IndexedDB stores the data, localStorage is a simple fallback for drafts, and a service worker stores the page’s files.',
                        do: async t => { await t.scrollTo('#offline .table-wrap'); await t.spotlight('#offline .table-wrap'); },
                    },
                ],
            },
            {
                title: 'Save and restore a draft',
                page: DEMO,
                steps: [
                    {
                        say: 'Save draft keeps every answer, and in offline mode the photos too.',
                        do: async t => {
                            await t.scrollTo(field('u4LightsPower'));
                            await t.click(answer('u4LightsPower', 'No'));
                            await t.click('[data-action-id="saveDraft"]');
                            await t.spotlight('[data-action-id="saveDraft"]');
                        },
                    },
                    {
                        say: 'Reload the page, and the answers come back, with a banner to discard the draft.',
                        do: async t => {
                            await t.clear();
                            await t.reload();
                            await t.scrollTo('.dfr-draft-banner');
                            await t.spotlight('.dfr-draft-banner');
                            await t.wait(2);
                            await t.scrollTo(field('u4LightsPower'));
                            await t.spotlight(field('u4LightsPower'));
                        },
                    },
                ],
            },
            {
                title: 'The outbox',
                page: GUIDE + '#flow-offline-submit',
                steps: [
                    {
                        say: 'If a report is submitted with no connection, it goes into an outbox in Indexed D B, and the form says one report is waiting.',
                        caption: 'If a report is submitted with no connection, it goes into an outbox in IndexedDB, and the form says one report is waiting.',
                        do: async t => { await t.scrollTo('#flow-offline-submit'); await t.spotlight('[data-flow="offlineSubmit"] .seq-scroll'); },
                    },
                    {
                        say: 'When the connection comes back, Offline Sync sends the waiting reports, oldest first. A temporary failure is simply retried later. A report the C R M refuses is kept, marked as failed, and not retried.',
                        caption: 'When the connection comes back, OfflineSync sends the waiting reports, oldest first. A temporary failure is simply retried later. A report the CRM refuses is kept, marked as failed, and not retried.',
                        do: async t => { await t.scrollBy(330); await t.spotlight('[data-flow="offlineSubmit"] .seq-group.loop'); },
                    },
                ],
            },
            {
                title: 'Opening the page offline',
                page: GUIDE + '#flow-offline-open',
                steps: [
                    {
                        say: 'The page itself opens without a network, too. On the first visit, the service worker keeps a copy of every file the page used. Later, if the network fails, it answers from those copies.',
                        do: async t => { await t.scrollTo('#flow-offline-open'); await t.spotlight('[data-flow="offlineOpen"] .seq-scroll'); },
                    },
                ],
            },
            {
                title: 'Where to go next',
                page: GUIDE + '#debugging',
                steps: [
                    {
                        say: 'You have now seen the whole codebase. When something looks wrong, start with these debugging recipes.',
                        do: async t => { await t.scrollTo('#debugging .table-wrap'); await t.spotlight('#debugging .table-wrap'); },
                    },
                    {
                        say: 'And to really learn it, do the first tasks at the end of the code guide. Each one is a small, real change, with the answer hidden until you try.',
                        do: async t => { await t.clear(); await t.scrollTo('#first-tasks'); },
                    },
                ],
            },
            {
                title: 'Thank you',
                page: card({ kicker: 'End of the tour', title: 'Happy building', subtitle: 'Docs, code guide and demo: ghchetan.github.io/dynamic-form' }),
                steps: [{ say: 'That is the end of the tour. Thanks for watching, and happy building.' }],
            },
        ],
    },

    // ═══════════════════════════════════════ 6 ═══════════════════════════════════════
    {
        number: 6,
        series: DEBUG_SERIES,
        title: 'Debugging: an answer turns red',
        summary: 'Answer No to a check, then follow the value through setValue, refresh and the evaluator in the debugger.',
        debug: {
            page: DEMO,
            breakpoints: [
                { id: 'click', file: 'src/fields/SegmentedField.js', match: 'this.form.setValue(this.name, option.value)', condition: "option.value === 'No'", show: ['this.name', 'option.value'] },
                { id: 'store', file: 'src/DynamicFormRenderer.js', match: 'setValue(name, value, { notify = true } = {}) {', offset: 1, condition: "name === 'u4LightsPower'", show: ['name', 'value'], watch: ['this.values.u4LightsPower'] },
                { id: 'refresh', file: 'src/DynamicFormRenderer.js', match: 'this.fields.forEach(field => field.recalculate());', condition: "this.values.u4LightsPower === 'No'", show: ['this.fields.length', 'this.widgets.length'] },
                { id: 'status', file: 'src/fields/BaseField.js', match: 'return evaluateStatus(this.config.evaluation, this.value);', condition: "this.name === 'u4LightsPower'", show: ['this.name', 'this.value', 'this.config.evaluation'] },
                { id: 'rule', file: 'src/evaluators/index.js', match: 'return value === rule.expectedValue', condition: "value === 'No'", show: ['value', 'rule.expectedValue', 'rule.failStatus'] },
                { id: 'unit', file: 'src/core/status.js', match: 'if (summary.hasFail) {', condition: 'summary.hasFail', show: ['summary'] },
            ],
            run: async t => { await t.scrollTo(field('u4LightsPower')); await t.click(answer('u4LightsPower', 'No')); },
        },
        scenes: [
            {
                title: 'Welcome',
                page: debugCard(6, 'An answer turns red', 'From one click to a red tab, in the debugger.'),
                steps: [{ say: 'Debugger walkthrough, episode six. We answer one question, and follow that answer through the real code, line by line, with the real values.' }],
            },
            {
                title: 'What the technician sees',
                page: DEMO,
                steps: [
                    {
                        say: 'On control panel C P 1, the technician answers No to: power to lights. Watch the chip, the tab dot and the deficiency list.',
                        do: async t => { await t.scrollTo(field('u4LightsPower')); await t.spotlight(field('u4LightsPower')); await t.wait(1.5); await t.click(answer('u4LightsPower', 'No')); await t.spotlight(field('u4LightsPower')); },
                    },
                    {
                        say: 'The field is now flagged, and the C P 1 tab shows a red dot. Let’s see how one click got there.',
                        do: async t => { await t.scrollTo('.dfr-unit-tabs'); await t.spotlight('.dfr-unit-tabs'); },
                    },
                ],
            },
            {
                title: 'Click and store',
                trace: true,
                steps: [
                    { pause: 'click', say: 'We are paused in the Sources panel. The click lands in segmented field. This arrow function runs for the No button, and calls form dot set value with the field name and the answer.', caption: 'We are paused in the Sources panel. The click lands in SegmentedField. This arrow function runs for the No button, and calls form.setValue() with the field name and the answer.' },
                    { pause: 'store', say: 'Step in, and we are in set value. Name is u 4 lights power, value is No. This one line is the only place the answer is stored: form dot values.', caption: 'Step in, and we are in setValue(). Name is u4LightsPower, value is No. This one line is the only place the answer is stored: form.values.' },
                ],
            },
            {
                title: 'Refresh',
                trace: true,
                steps: [
                    { pause: 'refresh', say: 'Then set value calls refresh. Refresh is a full pass. It updates every field and every widget, so nothing on screen keeps its own copy of the answer.', caption: 'Then setValue() calls refresh(). Refresh is a full pass. It updates every field and every widget, so nothing on screen keeps its own copy of the answer.' },
                    { pause: 'status', say: 'During refresh, our field asks for its status. It has an evaluation rule: expected value Yes. So get status hands the answer to the evaluator.', caption: 'During refresh, our field asks for its status. It has an evaluation rule: expectedValue Yes. So getStatus() hands the answer to the evaluator.' },
                ],
            },
            {
                title: 'The rule and the roll-up',
                trace: true,
                steps: [
                    { pause: 'rule', say: 'Here is the evaluator. Value is No, the expected value is Yes, so it returns the fail status: red.' },
                    { pause: 'unit', say: 'And here the unit adds up its fields. Has fail is true, so C P 1 becomes red, with the label: deficiency found. That is the red dot on the tab.', caption: 'And here the unit adds up its fields. hasFail is true, so CP-1 becomes red, with the label: deficiency found. That is the red dot on the tab.' },
                ],
            },
            debugEnd(6),
        ],
    },

    // ═══════════════════════════════════════ 7 ═══════════════════════════════════════
    {
        number: 7,
        series: DEBUG_SERIES,
        title: 'Debugging: submit succeeds',
        summary: 'Submit for review when the CRM accepts the report: the workflow, the request, and the draft being cleared.',
        debug: {
            page: LIVE,
            setup: crmAnswers(200),
            breakpoints: [
                { id: 'validate', file: 'src/actions/workflowAction.js', match: 'const missingNames = requiredNames.filter(', show: ['action.label', 'requiredNames'] },
                { id: 'status', file: 'src/actions/workflowAction.js', match: 'if (action.targetStatus) form.setReportStatus(action.targetStatus);', show: ['previousStatus', 'action.targetStatus'] },
                { id: 'online', file: 'src/DynamicFormRenderer.js', match: 'if (this.offlineSync && !navigator.onLine) return this.queueSubmission(request, data);', show: ['request.method', 'request.url', 'data.reportStatus'], watch: ['navigator.onLine'] },
                { id: 'response', file: 'src/core/http.js', match: 'if (!response.ok) throw new HttpError(response.status);', show: ['response.status', 'response.ok'] },
                { id: 'draft', file: 'src/DynamicFormRenderer.js', match: 'if (draft && draft.savedAt <= submittedAt) await this.draftStore.remove(this.config.id);', show: ['draft.savedAt', 'submittedAt'], watch: ['draft.savedAt <= submittedAt'] },
                { id: 'success', file: 'src/DynamicFormRenderer.js', match: 'this.callbacks.onSubmitSuccess?.(responseData, this);', show: ['responseData'] },
            ],
            run: async t => { await t.click(SAVE); await t.wait(0.5); await t.click(SUBMIT); await t.wait(1); },
        },
        scenes: [
            {
                title: 'Welcome',
                page: debugCard(7, 'Submit succeeds', 'Submit for review, when the CRM accepts the report.'),
                steps: [{ say: 'Episode seven: the happy path. The technician submits the report for review, and the C R M accepts it.', caption: 'Episode seven: the happy path. The technician submits the report for review, and the CRM accepts it.' }],
            },
            {
                title: 'What the technician sees',
                page: LIVE,
                setup: crmAnswers(200),
                steps: [
                    {
                        say: 'First the technician saves a draft. Then they press Submit for review.',
                        do: async t => { await t.click(SAVE); await t.wait(1); await t.click(SUBMIT); },
                    },
                    {
                        say: 'The status at the top changes to Review. The C R M has the report.',
                        caption: 'The status at the top changes to Review. The CRM has the report.',
                        do: async t => { await t.scrollTo('.dfr-header'); await t.spotlight('.dfr-status'); },
                    },
                ],
            },
            {
                title: 'The workflow button',
                trace: true,
                steps: [
                    { pause: 'validate', say: 'Submit for review is a workflow action. First it checks the required fields. This button has none, so the list is empty and it carries on.' },
                    { pause: 'status', say: 'The previous status is draft. It is kept in a variable, in case we need to put it back. Then the status changes to review, before anything is sent, so the report goes out with its new status.' },
                ],
            },
            {
                title: 'Sending the report',
                trace: true,
                steps: [
                    { pause: 'online', say: 'The page’s on workflow callback calls form dot submit. We are online, so it does not go to the outbox. It sends a post to slash A P I slash startup report.', caption: 'The page’s onWorkflow callback calls form.submit(). We are online, so it does not go to the outbox. It sends a POST to /api/startup-report.' },
                    { pause: 'response', say: 'The answer comes back. Status two hundred, response dot ok is true, so no error is thrown.', caption: 'The answer comes back. Status 200, response.ok is true, so no error is thrown.' },
                ],
            },
            {
                title: 'Cleaning up',
                trace: true,
                steps: [
                    { pause: 'draft', say: 'Now the saved draft. It was saved before this report was made, so it is deleted. If the technician had saved again after submitting, it would be kept.' },
                    { pause: 'success', say: 'Finally, on submit success tells the page, with the C R M’s answer.', caption: 'Finally, onSubmitSuccess tells the page, with the CRM’s answer.' },
                    { say: 'That is the whole happy path. Here it is again as a diagram in the code guide.', do: async t => { await t.open(GUIDE); await t.scrollTo('#flow-submit'); await t.spotlight('[data-flow="submit"] .seq-scroll'); } },
                ],
            },
            debugEnd(7),
        ],
    },

    // ═══════════════════════════════════════ 8 ═══════════════════════════════════════
    {
        number: 8,
        series: DEBUG_SERIES,
        title: 'Debugging: reject without a note',
        summary: 'The reviewer presses Reject with an empty note: the required-field check stops the workflow before anything changes.',
        debug: {
            page: DEMO,
            breakpoints: [
                { id: 'missing', file: 'src/actions/workflowAction.js', match: 'if (missingNames.length > 0) {', show: ['action.label', 'requiredNames', 'missingNames'] },
                { id: 'outline', file: 'src/fields/BaseField.js', match: "this.control?.classList.add('dfr-invalid');", show: ['this.name'] },
                { id: 'stop', file: 'src/actions/workflowAction.js', match: 'form.getField(missingNames[0])?.focus();', watch: ['form.getReportStatus()'] },
            ],
            run: async t => {
                await t.scrollTo('.dfr-reviewer-toggle'); await t.click('.dfr-reviewer-toggle');
                await t.scrollTo('.dfr-reviewer-card'); await t.click('.dfr-reviewer-actions button');
            },
        },
        scenes: [
            {
                title: 'Welcome',
                page: debugCard(8, 'Reject without a note', 'Validation stops the workflow before anything changes.'),
                steps: [{ say: 'Episode eight: a failure that never reaches the server. The reviewer rejects the report, but forgets the note.' }],
            },
            {
                title: 'What the reviewer sees',
                page: DEMO,
                steps: [
                    {
                        say: 'The reviewer opens the reviewer view, leaves the note empty, and presses Reject.',
                        do: async t => {
                            await t.scrollTo('.dfr-reviewer-toggle'); await t.click('.dfr-reviewer-toggle');
                            await t.scrollTo('.dfr-reviewer-card'); await t.click('.dfr-reviewer-actions button');
                        },
                    },
                    {
                        say: 'The note box is outlined in red, and the cursor is put in it. The status did not change.',
                        do: async t => { await t.spotlight('#accurexStartupReport__reviewerNote'); },
                    },
                ],
            },
            {
                title: 'The required-field check',
                trace: true,
                steps: [
                    { pause: 'missing', say: 'Reject lists reviewer note as a required field. It is empty, so missing names has one entry. The check is true.', caption: 'Reject lists reviewerNote as a required field. It is empty, so missingNames has one entry. The check is true.' },
                    { pause: 'outline', say: 'Each missing field is told to mark itself invalid. That adds the red outline. As soon as someone types in it, refresh removes the outline again.' },
                    { pause: 'stop', say: 'The first missing field gets the focus, and the function returns false. Look at the watch: the status is still draft. It returned before the status changed, and before anything was sent.' },
                ],
            },
            {
                title: 'With a note',
                page: DEMO,
                steps: [
                    {
                        say: 'With a note, the same button works. The status becomes rejected, and the note is shown.',
                        do: async t => {
                            await t.scrollTo('.dfr-reviewer-toggle'); await t.click('.dfr-reviewer-toggle');
                            await t.scrollTo('.dfr-reviewer-card');
                            await t.type('#accurexStartupReport__reviewerNote', 'Please attach the light circuit photo.');
                            await t.click('.dfr-reviewer-actions button');
                            await t.spotlight('.dfr-decision-banner');
                        },
                    },
                ],
            },
            debugEnd(8),
        ],
    },

    // ═══════════════════════════════════════ 9 ═══════════════════════════════════════
    {
        number: 9,
        series: DEBUG_SERIES,
        title: 'Debugging: the server refuses (400)',
        summary: 'The CRM answers 400. Why the report is not queued, and how the status is put back to Draft.',
        debug: {
            page: LIVE,
            setup: crmAnswers(400),
            breakpoints: [
                { id: 'refused', file: 'src/core/http.js', match: 'if (!response.ok) throw new HttpError(response.status);', show: ['response.status', 'response.ok'] },
                { id: 'classify', file: 'src/DynamicFormRenderer.js', match: 'if (this.offlineSync && isTemporaryFailure(error)) return this.queueSubmission(request, data);', show: ['error.name', 'error.status'], watch: ['isTemporaryFailure(error)'] },
                { id: 'caught', file: 'src/actions/workflowAction.js', match: 'console.error(', show: ['error.message'] },
                { id: 'rollback', file: 'src/actions/workflowAction.js', match: 'form.setReportStatus(previousStatus);', show: ['previousStatus'], watch: ['form.getReportStatus()'] },
                { id: 'done', file: 'src/actions/workflowAction.js', match: 'if (button) button.disabled = false;', watch: ['form.getReportStatus()'] },
            ],
            run: async t => { await t.click(SUBMIT); await t.wait(1); },
        },
        scenes: [
            {
                title: 'Welcome',
                page: debugCard(9, 'The server refuses', 'The CRM answers 400 Bad Request.'),
                steps: [{ say: 'Episode nine: the C R M refuses the report. It answers four hundred, bad request.', caption: 'Episode nine: the CRM refuses the report. It answers 400, Bad Request.' }],
            },
            {
                title: 'What the technician sees',
                page: LIVE,
                setup: crmAnswers(400),
                steps: [
                    {
                        say: 'The technician presses Submit for review. Watch the status at the top.',
                        do: async t => { await t.scrollTo('.dfr-header'); await t.spotlight('.dfr-status'); await t.wait(1.5); await t.click(SUBMIT); await t.spotlight('.dfr-status'); },
                    },
                    { say: 'It is still Draft. The status did change to Review, but the C R M said no, and it was put straight back, too fast to see. Let’s slow it down in the debugger.', caption: 'It is still Draft. The status did change to Review, but the CRM said no, and it was put straight back, too fast to see. Let’s slow it down in the debugger.' },
                ],
            },
            {
                title: 'The refusal',
                trace: true,
                steps: [
                    { pause: 'refused', say: 'In send request, the response is not ok. Its status is four hundred, so it throws an H T T P error.', caption: 'In sendRequest(), the response is not ok. Its status is 400, so it throws an HttpError.' },
                    { pause: 'classify', say: 'Submit catches it and asks one question: is this temporary? Look at the watch. is temporary failure returns false. A four hundred means the server looked at the report and said no. Sending it again would get the same answer, so it is not put in the outbox.', caption: 'submit() catches it and asks one question: is this temporary? Look at the watch. isTemporaryFailure() returns false. A 400 means the server looked at the report and said no. Sending it again would get the same answer, so it is not put in the outbox.' },
                ],
            },
            {
                title: 'Putting the status back',
                trace: true,
                steps: [
                    { pause: 'caught', say: 'Submit calls on submit error and throws again. The error reaches run workflow, which catches it.', caption: 'submit() calls onSubmitError and throws again. The error reaches runWorkflow(), which catches it.' },
                    { pause: 'rollback', say: 'Right now the status is review. The previous status, draft, was kept for exactly this moment, and is put back.' },
                    { pause: 'done', say: 'In the finally block the button is enabled again, and the status is draft. The screen never claims a review the C R M never received.', caption: 'In the finally block the button is enabled again, and the status is draft. The screen never claims a review the CRM never received.' },
                ],
            },
            debugEnd(9),
        ],
    },

    // ═══════════════════════════════════════ 10 ═══════════════════════════════════════
    {
        number: 10,
        series: DEBUG_SERIES,
        title: 'Debugging: offline, then synced',
        summary: 'Submit with no connection: the report goes to the outbox, and is sent when the connection comes back.',
        debug: {
            page: LIVE,
            setup: crmAnswers(200),
            breakpoints: [
                { id: 'offline', file: 'src/DynamicFormRenderer.js', match: 'if (this.offlineSync && !navigator.onLine) return this.queueSubmission(request, data);', show: ['request.url'], watch: ['navigator.onLine'] },
                { id: 'outbox', file: 'src/offline/outbox.js', match: 'export async function addToOutbox(formId, request) {', offset: 1, show: ['formId', 'request.method', 'request.url'] },
                { id: 'online', file: 'src/offline/OfflineSync.js', match: 'if (this.autoSync) this.syncNow();', show: ['this.autoSync', 'this.pendingCount'], watch: ['navigator.onLine'] },
                { id: 'send', file: 'src/offline/OfflineSync.js', match: 'const responseData = await sendRequest(entry.request);', show: ['entries.length', 'entry.id', 'entry.queuedAt'] },
                { id: 'sent', file: 'src/offline/OfflineSync.js', match: 'await removeFromOutbox(entry.id);', show: ['responseData'] },
            ],
            run: async t => { await t.offline(true); await t.wait(0.5); await t.click(SUBMIT); await t.wait(1); await t.offline(false); await t.wait(1.5); },
        },
        scenes: [
            {
                title: 'Welcome',
                page: debugCard(10, 'Offline, then synced', 'No signal on site: the outbox keeps the report.'),
                steps: [{ say: 'Episode ten: no signal on site. The technician submits anyway, and the report is sent when the connection comes back.' }],
            },
            {
                title: 'What the technician sees',
                page: LIVE,
                setup: crmAnswers(200),
                steps: [
                    {
                        say: 'The connection drops. The bar at the top says so. The technician presses Submit for review.',
                        do: async t => { await t.offline(true); await t.scrollTo('.dfr-header'); await t.wait(1); await t.click(SUBMIT); await t.spotlight('.dfr-sync-status'); },
                    },
                    { say: 'The status is Review, and the bar says one report is waiting to be sent.', do: async t => { await t.spotlight(['.dfr-status', '.dfr-sync-status']); } },
                    {
                        say: 'Now the connection comes back. Without anyone pressing anything, the report is sent and the bar disappears.',
                        do: async t => { await t.clear(); await t.offline(false); await t.wait(2); await t.spotlight('.dfr-header'); },
                    },
                ],
            },
            {
                title: 'Into the outbox',
                trace: true,
                steps: [
                    { pause: 'offline', say: 'In submit, navigator dot on line is false. So there is no point trying. It goes straight to queue submission.', caption: 'In submit(), navigator.onLine is false. So there is no point trying. It goes straight to queueSubmission().' },
                    { pause: 'outbox', say: 'The outbox is a store in Indexed D B. The request is saved exactly as it would have been sent: U R L, method, headers and body. That is why requests are plain objects.', caption: 'The outbox is a store in IndexedDB. The request is saved exactly as it would have been sent: URL, method, headers and body. That is why requests are plain objects.' },
                ],
            },
            {
                title: 'Back online',
                trace: true,
                steps: [
                    { pause: 'online', say: 'When the browser fires its online event, offline sync wakes up. Auto sync is on, and one report is pending, so it calls sync now.', caption: 'When the browser fires its online event, OfflineSync wakes up. autoSync is on, and one report is pending, so it calls syncNow().' },
                    { pause: 'send', say: 'It sends the waiting entries one by one, oldest first, so the C R M gets reports in the order they were made.', caption: 'It sends the waiting entries one by one, oldest first, so the CRM gets reports in the order they were made.' },
                    { pause: 'sent', say: 'Sent. The entry is removed from the outbox. If the server had answered five hundred instead, is temporary failure would say true, and the entry would simply wait for the next try.', caption: 'Sent. The entry is removed from the outbox. If the server had answered 500 instead, isTemporaryFailure() would say true, and the entry would simply wait for the next try.' },
                    { say: 'Here is the same flow as a diagram in the code guide: offline submit, the outbox, and the sync when the connection comes back.', do: async t => { await t.open(GUIDE); await t.scrollTo('#flow-offline-submit'); await t.spotlight('[data-flow="offlineSubmit"] .seq-scroll'); } },
                ],
            },
            debugEnd(10),
        ],
    },
];
