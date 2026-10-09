# Video tour

The tutorial videos on [docs/video-tutorial.html](../docs/video-tutorial.html) are generated from code, so they can be rebuilt whenever the product changes. Nobody needs to re-record a screen. There are two series: the **Code tour** (episodes 1–5) and the **Debugger walkthroughs** (episodes 6–10), which pause the real code at real breakpoints.

```bash
node video/build.mjs          # all episodes
node video/build.mjs 3        # only episode 3
node video/build.mjs --trace 9  # only capture episode 9's debugger pauses and print them (fast, no video)
```

Output goes to `docs/videos/`: `episode-N.mp4`, captions (`episode-N.vtt`), chapters (`episode-N-chapters.vtt`), a poster image, and `episodes.json`, which the video page reads. Commit those files, and the GitHub Pages workflow publishes them.

## Changing a video

Everything is in [episodes.mjs](episodes.mjs). Each episode is a list of scenes, and each scene opens one page and plays its steps:

```js
{
    title: 'The field registry',              // chapter name under the video
    page: 'docs/code-guide.html#fields',       // the page to record
    steps: [
        {
            say: 'Every question in the form is a field object…',   // narration
            do: async t => {                                        // what happens on screen meanwhile
                await t.scrollTo('figure.excerpt[data-start="export const FIELD_TYPES = {"]');
                await t.spotlight('figure.excerpt[data-start="export const FIELD_TYPES = {"]');
            },
        },
    ],
}
```

A step lasts as long as its narration, or longer if its actions need more time. Write `say` the way it should sound ("C R M", "sample dot H T M L"). If the captions should read differently, add `caption: 'CRM'`.

### The `t` toolkit

| Call | Does |
|---|---|
| `t.scrollTo(selector, gap?)` | Smooth-scroll so the element sits just below anything pinned to the top |
| `t.scrollBy(pixels)` | Smooth-scroll by a distance |
| `t.spotlight(selector or [selectors])` | Dim the page except these elements |
| `t.spotlightRow(table, firstCellText)` | Spotlight one table row |
| `t.clear()` | Remove the spotlight |
| `t.click(selector)` | Glide the visible cursor there and click (with a ripple) |
| `t.type(selector, text)` | Click, then type like a person |
| `t.console(command)` | Type a command into an on-screen console and show its real result |
| `t.reload()` | Reload the page (e.g. to show a restored draft) |
| `t.wait(seconds)` | Pause |
| `t.open(path)` | Go to another page of the site in the same scene (e.g. the code guide) |
| `t.offline(true / false)` | Cut or restore the network connection |

A scene can also have `setup: async ({ context, page }) => { … }`, which runs before the page opens. The walkthroughs use it to fake the CRM's answer: `crmAnswers(400)` in `episodes.mjs` makes `POST /api/startup-report` return 400.

The cursor, spotlight and console come from [overlay.js](overlay.js), which is injected only while recording. Title and end cards come from [card.html](card.html).

## How a build works

1. **Narration.** Each step's `say` text is spoken with macOS `say` and saved as audio.
2. **Recording.** Each scene is played in headless Chromium (Playwright) at 1280×720 and recorded, waiting at every step for as long as its narration lasts.
3. **Assembly.** ffmpeg trims each recording, adds its narration, and joins the scenes into one MP4 per episode.
4. **Captions and chapters.** WebVTT files are written from the same timings, so captions match the narration.

The local pages are served by a small built-in server, and recordings always use the light theme and block the service worker, so every build looks the same.

## Requirements

- macOS (for the `say` voices)
- ffmpeg and ffprobe: `brew install ffmpeg`
- playwright-core with Chromium, either installed in this project or globally: `npm i -g playwright-core && npx playwright-core install chromium`

## The voice

The build uses an installed **Premium** (or Enhanced) English voice if there is one, and Samantha otherwise. To install a natural-sounding voice, open **System Settings → Accessibility → Spoken Content → System Voice → ⓘ → Manage Voices…** and download, for example, *English (India) → Isha (Premium)*. To choose a specific voice:

```bash
VOICE="Isha (Premium)" node video/build.mjs
```

`episodes.json` records which voice was used.

## Debugger walkthroughs

These episodes show the real code paused in a debugger. An episode gets a `debug` spec, and its scenes marked `trace: true` show one captured pause per step:

```js
{
    number: 9,
    series: 'Debugger walkthroughs',
    debug: {
        page: 'sample.html',                 // without ?demo, so Submit really calls form.submit()
        setup: crmAnswers(400),              // the CRM refuses the report
        breakpoints: [
            { id: 'classify', file: 'src/DynamicFormRenderer.js',
              match: 'if (this.offlineSync && isTemporaryFailure(error))',   // the line to stop on, found by its text
              show: ['error.status'],                                       // shown under Scope
              watch: ['isTemporaryFailure(error)'] },                       // shown under Watch
        ],
        run: async t => { await t.click('[data-action-id="submitForReview"]'); },
    },
    scenes: [
        { title: 'The refusal', trace: true, steps: [{ pause: 'classify', say: '…' }] },
    ],
}
```

Breakpoint options: `condition` (only stop when this JavaScript is true, e.g. `"this.name === 'u4LightsPower'"`), `hits` (stop more than once; refer to the second stop as `pause: 'id#2'`) and `offset: 1` (stop on the line after `match`, for a line whose own text isn't unique).

How it works:

1. Before recording, [trace.mjs](trace.mjs) plays `run` in headless Chromium with the JavaScript debugger switched on, through the Chrome DevTools Protocol. At every breakpoint it saves the file, line, call stack (async calls included) and the values of `show` and `watch`, then resumes. The pauses go to `video/.build/traces/episode-N.json`.
2. Each `trace: true` scene records [debugger.html](debugger.html), which draws a captured pause like the DevTools Sources panel.

The build stops with a clear message, rather than showing the wrong line, when:

- a `match` text is not found exactly once
- a breakpoint is never hit, or is hit fewer times than `hits`
- a breakpoint would stop on a different line than its `match` (put `match` at the start of a statement)

So after changing the code, run `node video/build.mjs --trace` first: it checks every walkthrough in under a minute.
