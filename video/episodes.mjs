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

export const EPISODES = [
    // ═══════════════════════════════════════ 1 ═══════════════════════════════════════
    {
        number: 1,
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
];
