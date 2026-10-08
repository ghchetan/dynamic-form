#!/usr/bin/env node
/**
 * Builds the tutorial videos from video/episodes.mjs.
 *
 *   node video/build.mjs            all episodes
 *   node video/build.mjs 2 3        only episodes 2 and 3
 *   VOICE="Isha (Premium)" node video/build.mjs
 *
 * What it does, per episode:
 *   1. Narration: every step's text is spoken with macOS `say` and saved as audio.
 *   2. Recording: every scene is played in a headless Chromium (Playwright) and recorded,
 *      waiting at each step for as long as its narration lasts, so picture and sound line up.
 *   3. Assembly (ffmpeg): each scene's video is trimmed and joined with its narration,
 *      and the scenes are joined into one MP4.
 *   4. Captions and chapters: WebVTT files built from the same narration timings.
 *
 * Output (published with the site): docs/videos/episode-N.mp4, .vtt captions, chapter .vtt, poster .jpg,
 * and docs/videos/episodes.json, which the video page reads.
 *
 * Needs: macOS (`say`), ffmpeg + ffprobe, and playwright-core with Chromium
 * (installed in this project or globally: npm i -g playwright-core && npx playwright-core install chromium).
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EPISODES } from './episodes.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'docs', 'videos');
const WORK_DIR = join(ROOT, 'video', '.build');          // scratch files, git-ignored
const PORT = 8770;
const VIEWPORT = { width: 1280, height: 720 };
const SPEECH_RATE = 172;                                  // words per minute
const GAP_AFTER_STEP = 0.35;                              // seconds of quiet between steps

// ───────────────────────────── Small helpers ─────────────────────────────

const run = (command, args) => execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const sum = numbers => numbers.reduce((total, number) => total + number, 0);
const log = message => console.log(`[video] ${message}`);

function durationOf(file) {
    return Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());
}

function loadPlaywright() {
    const require = createRequire(import.meta.url);
    try { return require('playwright-core'); } catch { /* not installed in the project: try the global one */ }
    return require(join(run('npm', ['root', '-g']).trim(), 'playwright-core'));
}

/** The narration voice: $VOICE, else an installed Premium/Enhanced English voice, else Samantha. */
function pickVoice() {
    if (process.env.VOICE) return process.env.VOICE;
    const voices = run('say', ['-v', '?']).split('\n')
        .map(line => ({ name: line.split(/\s{2,}/)[0].trim(), locale: (line.match(/\b([a-z]{2}_[A-Z]{2})\b/) || [])[1] || '' }))
        .filter(voice => voice.locale.startsWith('en_'));
    const best = voices.find(voice => voice.name.includes('(Premium)')) || voices.find(voice => voice.name.includes('(Enhanced)'));
    return best ? best.name : 'Samantha';
}

// ───────────────────────────── 1. Narration ─────────────────────────────

function speak(text, voice, file) {
    const aiff = file.replace(/\.wav$/, '.aiff');
    run('say', ['-v', voice, '-r', String(SPEECH_RATE), '-o', aiff, text]);
    run('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-ar', '48000', '-ac', '1', file]);
    rmSync(aiff);
    return { file, duration: durationOf(file) };
}

// ───────────────────────────── 2. Recording ─────────────────────────────

/** A tiny static file server for the repo, so pages load exactly as they do on the website. */
function startServer() {
    const types = {
        '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
        '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
    };
    const server = createServer((request, response) => {
        let path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        if (path.endsWith('/')) path += 'index.html';
        const file = resolve(ROOT, '.' + path);
        if (!file.startsWith(ROOT + sep) || !existsSync(file)) { response.writeHead(404); response.end('Not found'); return; }
        response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        response.end(readFileSync(file));
    });
    return new Promise(resolveServer => server.listen(PORT, () => resolveServer(server)));
}

/** Wait until the page has stopped scrolling (smooth scrolls take a variable time). */
function untilScrollStops(page) {
    return page.evaluate(async () => {
        const started = performance.now();
        let lastY = -1;
        let stillSince = performance.now();
        while (performance.now() - started < 4000) {
            await new Promise(resolve => requestAnimationFrame(resolve));
            if (window.scrollY !== lastY) { lastY = window.scrollY; stillSince = performance.now(); }
            else if (performance.now() - stillSince > 250) return;
        }
    });
}

/** The helpers a scene's steps use (the `t` in episodes.mjs). */
function toolkit(page) {
    const t = {
        page,
        wait: seconds => page.waitForTimeout(seconds * 1000),

        /**
         * Smoothly scroll so the element sits `gap` pixels below anything pinned to the top of the page
         * (the docs top bar, or the form's sticky header), so it is never hidden underneath it.
         */
        async scrollTo(selector, gap = 24) {
            await page.evaluate(([target, space]) => {
                const element = document.querySelector(target);
                if (!element) throw new Error('scrollTo: nothing matches ' + target);
                // Where would pinned elements end once the page has scrolled? A sticky header may not be
                // pinned yet (e.g. a banner sits above it), so use its "top" setting, not its current position.
                const pinnedBottom = Math.max(0, ...[...document.body.querySelectorAll('*')]
                    .filter(node => !node.id.startsWith('__tour') && !node.classList.contains('__tour-ripple'))
                    .map(node => {
                        const style = getComputedStyle(node);
                        const rect = node.getBoundingClientRect();
                        if (rect.height === 0 || rect.height > window.innerHeight / 2) return 0;
                        if (style.position === 'sticky' && style.top !== 'auto') return parseFloat(style.top) + rect.height;
                        if (style.position === 'fixed' && rect.top <= 5) return rect.bottom;
                        return 0;   // not pinned to the top (e.g. the action bar fixed to the bottom)
                    }));
                window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - pinnedBottom - space, behavior: 'smooth' });
            }, [selector, gap]);
            await page.waitForTimeout(300);
            await untilScrollStops(page);
        },

        async scrollBy(pixels) {
            await page.evaluate(top => window.scrollBy({ top, behavior: 'smooth' }), pixels);
            await page.waitForTimeout(300);
            await untilScrollStops(page);
        },

        /** Dim everything except these element(s). */
        async spotlight(targets) {
            await page.evaluate(selectors => window.__tour.spotlight(selectors), targets);
            await page.waitForTimeout(400);
        },

        /** Spotlight the table row whose first cell reads exactly `firstCellText`. */
        async spotlightRow(tableSelector, firstCellText) {
            await page.evaluate(([table, text]) => {
                const row = [...document.querySelectorAll(table + ' tr')].find(candidate => candidate.cells[0]?.textContent.trim() === text);
                if (!row) throw new Error('spotlightRow: no row starting with ' + text);
                window.__tour.spotlight(row);
            }, [tableSelector, firstCellText]);
            await page.waitForTimeout(400);
        },

        clear: () => page.evaluate(() => window.__tour.clear()),

        /**
         * Glide the visible cursor to the middle of an element. Fails loudly if something covers it
         * (e.g. a pinned header), because a click there would silently hit the wrong thing.
         */
        async moveTo(selector) {
            const box = await page.locator(selector).first().boundingBox();
            if (!box) throw new Error('moveTo: nothing visible matches ' + selector);
            const x = box.x + box.width / 2;
            const y = box.y + box.height / 2;
            const coveredBy = await page.evaluate(([target, pointX, pointY]) => {
                const element = document.querySelector(target);
                const hit = document.elementFromPoint(pointX, pointY);
                if (!hit || element === hit || element.contains(hit) || hit.closest('[id^="__tour"]')) return null;
                return hit.tagName.toLowerCase() + (hit.className ? '.' + String(hit.className).split(' ')[0] : '');
            }, [selector, x, y]);
            if (coveredBy) throw new Error(`moveTo: ${selector} is covered by ${coveredBy}; scroll to it first`);
            await page.mouse.move(x, y, { steps: 22 });
            await page.waitForTimeout(150);
        },

        async click(selector) {
            await t.clear();
            await t.moveTo(selector);
            await page.mouse.down();
            await page.mouse.up();
            await page.waitForTimeout(500);
        },

        async type(selector, text) {
            await t.click(selector);
            await page.keyboard.type(text, { delay: 90 });
            await page.waitForTimeout(300);
        },

        /** Type a command into the on-screen console and show its real result. */
        async console(command) {
            await page.evaluate(text => window.__tour.console(text), command);
            await page.waitForTimeout(600);
        },

        async reload() {
            await page.reload({ waitUntil: 'networkidle' });
            await settle(page);
        },
    };
    return t;
}

/** Wait until fonts, code excerpts and diagrams on the page have finished loading. */
async function settle(page) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(
        () => !document.querySelector('.excerpt-loading') && !document.querySelector('.flow-diagram:not(:has(svg))'),
        null, { timeout: 15000 },
    ).catch(() => { /* pages without excerpts or diagrams */ });
    await untilScrollStops(page);   // pages opened at an #anchor may still be scrolling to it
    await page.waitForTimeout(400);
}

async function recordScene(browser, scene, narration, label) {
    const context = await browser.newContext({
        viewport: VIEWPORT, deviceScaleFactor: 1, colorScheme: 'light', serviceWorkers: 'block',
        recordVideo: { dir: WORK_DIR, size: VIEWPORT },
    });
    await context.addInitScript({ path: join(ROOT, 'video', 'overlay.js') });
    await context.addInitScript(() => { try { localStorage.setItem('accurex-docs-theme', 'light'); } catch { /* fine */ } });

    const page = await context.newPage();
    const recordingStarted = Date.now();
    await page.goto(`http://localhost:${PORT}/${scene.page}`, { waitUntil: 'networkidle' });
    await settle(page);
    await page.mouse.move(VIEWPORT.width * 0.62, VIEWPORT.height * 0.82);

    const t = toolkit(page);
    const sceneStarted = Date.now();
    const stepLengths = [];
    for (const [index, step] of scene.steps.entries()) {
        const stepStarted = Date.now();
        try {
            if (step.do) await step.do(t);
        } catch (error) {
            throw new Error(`${label}, step ${index + 1}: ${error.message}`);
        }
        const elapsed = (Date.now() - stepStarted) / 1000;
        const remaining = Math.max(0, narration[index].duration + GAP_AFTER_STEP - elapsed);
        await page.waitForTimeout(remaining * 1000);
        stepLengths.push((Date.now() - stepStarted) / 1000);
    }
    await page.waitForTimeout(400);  // a little extra so the trim never runs past the recording

    const video = page.video();
    await context.close();
    return { webm: await video.path(), offset: (sceneStarted - recordingStarted) / 1000, stepLengths };
}

// ───────────────────────────── 3. Assembly ─────────────────────────────

function assembleScene(recording, narration, output) {
    const total = sum(recording.stepLengths);
    const audioInputs = narration.flatMap(step => ['-i', step.file]);
    const padded = narration.map((step, index) => {
        const length = recording.stepLengths[index].toFixed(3);
        return `[${index + 1}:a]apad=whole_dur=${length},atrim=0:${length}[a${index}]`;
    });
    const filter = padded.join(';') + ';' + narration.map((_, index) => `[a${index}]`).join('') + `concat=n=${narration.length}:v=0:a=1[audio]`;

    run('ffmpeg', [
        '-y', '-loglevel', 'error',
        '-ss', recording.offset.toFixed(3), '-t', total.toFixed(3), '-i', recording.webm,
        ...audioInputs,
        '-filter_complex', filter,
        '-map', '0:v', '-map', '[audio]', '-t', total.toFixed(3),
        '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-tune', 'stillimage',
        '-c:a', 'aac', '-b:a', '96k', '-ar', '48000',
        output,
    ]);
    return total;
}

// ───────────────────────────── 4. Captions and chapters ─────────────────────────────

function timestamp(seconds) {
    const milliseconds = Math.round(seconds * 1000);
    const pad = (number, size) => String(number).padStart(size, '0');
    return `${pad(Math.floor(milliseconds / 3600000), 2)}:${pad(Math.floor(milliseconds / 60000) % 60, 2)}:${pad(Math.floor(milliseconds / 1000) % 60, 2)}.${pad(milliseconds % 1000, 3)}`;
}

/** Sentences, with very long ones split at a comma or colon so a caption fits on two lines. */
function captionChunks(text) {
    const sentences = text.match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g).map(sentence => sentence.trim()).filter(Boolean);
    return sentences.flatMap(sentence => {
        if (sentence.length <= 95) return [sentence];
        const middle = sentence.length / 2;
        const cuts = [...sentence.matchAll(/[,:] /g)].map(match => match.index + 1);
        if (!cuts.length) return [sentence];
        const cut = cuts.reduce((best, candidate) => (Math.abs(candidate - middle) < Math.abs(best - middle) ? candidate : best));
        return [sentence.slice(0, cut).trim(), sentence.slice(cut).trim()];
    });
}

function buildCaptions(timeline) {
    const cues = [];
    for (const step of timeline) {
        const chunks = captionChunks(step.caption);
        const totalCharacters = sum(chunks.map(chunk => chunk.length));
        let start = step.start;
        for (const chunk of chunks) {
            const length = step.audioDuration * (chunk.length / totalCharacters);
            cues.push(`${timestamp(start)} --> ${timestamp(start + length)}\n${chunk}`);
            start += length;
        }
    }
    return 'WEBVTT\n\n' + cues.map((cue, index) => `${index + 1}\n${cue}`).join('\n\n') + '\n';
}

function buildChapters(chapters, total) {
    return 'WEBVTT\n\n' + chapters.map((chapter, index) => {
        const end = index + 1 < chapters.length ? chapters[index + 1].start : total;
        return `${index + 1}\n${timestamp(chapter.start)} --> ${timestamp(end)}\n${chapter.title}`;
    }).join('\n\n') + '\n';
}

// ───────────────────────────── Episode ─────────────────────────────

async function buildEpisode(browser, episode, voice) {
    const name = `episode-${episode.number}`;
    const workDir = join(WORK_DIR, name);
    rmSync(workDir, { recursive: true, force: true });
    mkdirSync(workDir, { recursive: true });

    const sceneFiles = [];
    const timeline = [];
    const chapters = [];
    let clock = 0;

    for (const [sceneIndex, scene] of episode.scenes.entries()) {
        const label = `episode ${episode.number}, scene ${sceneIndex + 1} (${scene.title})`;
        log(`${label}: narration`);
        const narration = scene.steps.map((step, stepIndex) => speak(step.say, voice, join(workDir, `s${sceneIndex}-${stepIndex}.wav`)));

        log(`${label}: recording ${sum(narration.map(step => step.duration)).toFixed(1)} s`);
        const recording = await recordScene(browser, scene, narration, label);

        const sceneFile = join(workDir, `scene-${String(sceneIndex).padStart(2, '0')}.mp4`);
        const length = assembleScene(recording, narration, sceneFile);
        rmSync(recording.webm, { force: true });   // the raw recording is no longer needed
        sceneFiles.push(sceneFile);

        chapters.push({ title: scene.title, start: clock });
        let stepStart = clock;
        scene.steps.forEach((step, stepIndex) => {
            timeline.push({ start: stepStart, audioDuration: narration[stepIndex].duration, caption: step.caption || step.say });
            stepStart += recording.stepLengths[stepIndex];
        });
        clock += length;
    }

    log(`episode ${episode.number}: joining ${sceneFiles.length} scenes`);
    const listFile = join(workDir, 'scenes.txt');
    writeFileSync(listFile, sceneFiles.map(file => `file '${file}'`).join('\n'));
    const mp4 = join(OUT_DIR, `${name}.mp4`);
    run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', mp4]);
    run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2', '-i', mp4, '-frames:v', '1', '-q:v', '4', join(OUT_DIR, `${name}-poster.jpg`)]);

    const duration = durationOf(mp4);
    writeFileSync(join(OUT_DIR, `${name}.vtt`), buildCaptions(timeline));
    writeFileSync(join(OUT_DIR, `${name}-chapters.vtt`), buildChapters(chapters, duration));

    return {
        number: episode.number,
        title: episode.title,
        summary: episode.summary,
        duration: Math.round(duration),
        video: `videos/${name}.mp4`,
        poster: `videos/${name}-poster.jpg`,
        captions: `videos/${name}.vtt`,
        chaptersTrack: `videos/${name}-chapters.vtt`,
        chapters: chapters.map(chapter => ({ title: chapter.title, start: Math.round(chapter.start) })),
    };
}

// ───────────────────────────── Main ─────────────────────────────

const wanted = process.argv.slice(2).map(Number).filter(Boolean);
const episodes = EPISODES.filter(episode => !wanted.length || wanted.includes(episode.number));
if (!episodes.length) { console.error('No such episode. Episodes: ' + EPISODES.map(episode => episode.number).join(', ')); process.exit(1); }

const voice = pickVoice();
log(`voice: ${voice}`);
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(WORK_DIR, { recursive: true });

const server = await startServer();
const { chromium } = loadPlaywright();
const browser = await chromium.launch();

const manifestFile = join(OUT_DIR, 'episodes.json');
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : { episodes: [] };
try {
    for (const episode of episodes) {
        const entry = await buildEpisode(browser, episode, voice);
        manifest.episodes = manifest.episodes.filter(existing => existing.number !== entry.number).concat(entry).sort((a, b) => a.number - b.number);
        manifest.voice = voice;
        manifest.builtAt = new Date().toISOString().slice(0, 10);
        writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
        log(`episode ${entry.number} done: ${Math.floor(entry.duration / 60)}:${String(entry.duration % 60).padStart(2, '0')}`);
    }
} finally {
    await browser.close();
    server.close();
}
