/**
 * Captures real debugger pauses for the "Debugger walkthrough" videos.
 *
 * Before an episode is recorded, build.mjs calls captureTrace() with the episode's `debug` spec.
 * It plays the scenario in a headless Chromium with the JavaScript debugger switched on
 * (the Chrome DevTools Protocol, the same debugger DevTools uses), and at every breakpoint it writes down:
 *   - where it stopped: file, line, function
 *   - the call stack, including the async calls that led there
 *   - the values of the variables and expressions the episode asks for
 * Then it resumes. video/debugger.html later shows each pause in a DevTools-style panel.
 *
 * Breakpoints are found by TEXT, not line numbers:
 *   { id: 'rollback', file: 'src/actions/workflowAction.js', match: 'form.setReportStatus(previousStatus)',
 *     condition: 'previousStatus === "draft"',   // optional: only stop when this is true
 *     show: ['previousStatus'],                  // shown under "Scope"
 *     watch: ['form.getReportStatus()'],         // shown under "Watch"
 *     hits: 1,                                   // how many times to stop (default 1)
 *     offset: 1 }                                // optional: stop on the line after `match`
 * The build fails if a text is not found exactly once, or a breakpoint is not hit as often as asked,
 * so a code change can never make a video show the wrong line.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_TEXT = 140;            // longest value shown in the panel
const SETTLE_AFTER_RUN_MS = 1500; // let async work (IndexedDB, fetch) finish after the last action

/**
 * Find the one line (and column) of `file` that contains `match`.
 * With `offset: 1` the breakpoint goes on the line after it (for a line whose own text is not unique).
 */
function locate(root, breakpoint) {
    const lines = readFileSync(join(root, breakpoint.file), 'utf8').split('\n');
    const found = lines.flatMap((text, line) => (text.includes(breakpoint.match) ? [{ line, column: text.indexOf(breakpoint.match) }] : []));
    if (found.length !== 1) {
        throw new Error(`breakpoint "${breakpoint.id}": "${breakpoint.match}" appears ${found.length} times in ${breakpoint.file} (it must appear exactly once)`);
    }
    if (!breakpoint.offset) return found[0];
    const line = found[0].line + breakpoint.offset;
    return { line, column: lines[line].search(/\S/) };
}

/** Turn a debugger value (RemoteObject) into the short text DevTools would show. */
function describe(remote) {
    if (!remote) return 'undefined';
    const clip = text => (text.length > MAX_TEXT ? text.slice(0, MAX_TEXT - 1) + '…' : text);
    if (remote.type === 'string') return clip(JSON.stringify(remote.value));
    if (remote.type === 'undefined') return 'undefined';
    if (remote.subtype === 'null') return 'null';
    if (['number', 'boolean', 'bigint'].includes(remote.type)) return String(remote.value ?? remote.description);
    if (remote.type === 'function') return `ƒ ${remote.description.match(/^(?:async\s+)?(?:function\s*)?([\w$]*)/)?.[1] || ''}()`;
    if (remote.subtype === 'error') return clip(remote.description.split('\n')[0]);

    const preview = remote.preview;
    if (!preview) return clip(remote.description || remote.className || 'Object');
    const parts = preview.properties.map(property => {
        const value = property.type === 'string' ? JSON.stringify(property.value)
            : property.type === 'object' ? (property.subtype === 'null' ? 'null' : property.value || '{…}')
            : property.value;
        return remote.subtype === 'array' ? value : `${property.name}: ${value}`;
    });
    if (preview.overflow) parts.push('…');
    const body = parts.join(', ');
    if (remote.subtype === 'array') return clip(`${remote.description} [${body}]`);
    const name = remote.className && remote.className !== 'Object' ? remote.className + ' ' : '';
    return clip(`${name}{${body}}`);
}

const repoPath = (url, origin) => (url.startsWith(origin) ? url.slice(origin.length).split('?')[0] : url);

/**
 * @param browser   a Playwright Chromium browser
 * @param spec      the episode's `debug` object: { page, setup?, breakpoints, run }
 * @param helpers   { root, port, overlayPath, toolkit, settle } from build.mjs
 * @returns {{ pauses: object[] }}
 */
export async function captureTrace(browser, spec, { root, port, overlayPath, toolkit, settle }) {
    const origin = `http://localhost:${port}/`;
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, colorScheme: 'light', serviceWorkers: 'block' });
    await context.addInitScript({ path: overlayPath });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    // Paused frames carry a script id, not always a URL: remember which id is which file.
    const scriptUrls = new Map();
    cdp.on('Debugger.scriptParsed', ({ scriptId, url }) => scriptUrls.set(scriptId, url));
    const fileOf = frame => repoPath(frame.url || scriptUrls.get(frame.location?.scriptId ?? frame.scriptId) || '', origin);

    await cdp.send('Debugger.enable');
    await cdp.send('Debugger.setAsyncCallStackDepth', { maxDepth: 8 });

    const byCdpId = new Map();   // CDP breakpoint id → { spec, hits }
    for (const breakpoint of spec.breakpoints) {
        const { line, column } = locate(root, breakpoint);
        const { breakpointId } = await cdp.send('Debugger.setBreakpointByUrl', {
            url: origin + breakpoint.file, lineNumber: line, columnNumber: column, condition: breakpoint.condition || '',
        });
        byCdpId.set(breakpointId, { spec: breakpoint, line, hits: 0 });
    }

    const pauses = [];
    const failures = [];

    async function evaluate(callFrameId, expression) {
        try {
            const { result, exceptionDetails } = await cdp.send('Debugger.evaluateOnCallFrame', {
                callFrameId, expression, generatePreview: true, silent: true,
            });
            return exceptionDetails ? `⚠ ${exceptionDetails.exception?.description?.split('\n')[0] || 'error'}` : describe(result);
        } catch (error) {
            return `⚠ ${error.message}`;
        }
    }

    cdp.on('Debugger.paused', async ({ callFrames, asyncStackTrace, hitBreakpoints = [] }) => {
        try {
            const top = callFrames[0];
            const entry = hitBreakpoints.map(id => byCdpId.get(id)).find(Boolean);
            if (!entry || entry.hits >= (entry.spec.hits || 1)) return;
            // A breakpoint in the middle of an expression can slide to the next statement. Then the video
            // would show the wrong line (and two breakpoints could share one pause), so stop the build.
            if (top.location.lineNumber !== entry.line) {
                failures.push(`breakpoint "${entry.spec.id}" stopped on line ${top.location.lineNumber + 1}, not ${entry.line + 1}: put "match" at the start of a statement`);
                return;
            }
            entry.hits += 1;

            const stack = callFrames.slice(0, 6).map(frame => ({
                fn: frame.functionName || '(anonymous)', file: fileOf(frame), line: frame.location.lineNumber + 1,
            }));
            for (let parent = asyncStackTrace; parent && stack.length < 10; parent = parent.parent) {
                const frames = parent.callFrames.filter(frame => fileOf(frame).startsWith('src/') || frame.url.startsWith(origin));
                if (!frames.length) continue;
                stack.push({ async: parent.description || 'async' });
                frames.slice(0, 3).forEach(frame => stack.push({
                    fn: frame.functionName || '(anonymous)', file: fileOf(frame), line: frame.lineNumber + 1,
                }));
            }

            const scope = [];
            for (const name of entry.spec.show || []) scope.push({ name, value: await evaluate(top.callFrameId, name) });
            const watch = [];
            for (const expression of entry.spec.watch || []) watch.push({ name: expression, value: await evaluate(top.callFrameId, expression) });

            pauses.push({
                id: entry.spec.id,
                hit: entry.hits,
                file: fileOf(top),
                line: top.location.lineNumber + 1,
                fn: top.functionName || '(anonymous)',
                scope,
                watch,
                stack,
            });
        } catch (error) {
            failures.push(error.message);
        } finally {
            await cdp.send('Debugger.resume').catch(() => { /* page already gone */ });
        }
    });

    try {
        if (spec.setup) await spec.setup({ context, page });
        await page.goto(origin + spec.page, { waitUntil: 'networkidle' });
        await settle(page);
        await spec.run(toolkit(page));
        await page.waitForTimeout(SETTLE_AFTER_RUN_MS);
    } finally {
        await context.close();
    }

    if (failures.length) throw new Error('debugger trace: ' + failures.join('; '));
    for (const { spec: breakpoint, hits } of byCdpId.values()) {
        const wanted = breakpoint.hits || 1;
        if (hits < wanted) {
            throw new Error(`breakpoint "${breakpoint.id}" (${breakpoint.file}: "${breakpoint.match}") was hit ${hits} of ${wanted} times`);
        }
    }
    return { pauses };
}
