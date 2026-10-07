/**
 * Accurex Dynamic Form — service worker. Lets the form page OPEN without a connection.
 *
 * A service worker is a small script the browser keeps running in the background for this
 * site. It can answer the page's requests itself, for example from a saved copy when the
 * network is down.
 *
 * Division of work:
 *   this file  → stores the page's FILES (HTML, CSS, JavaScript)
 *   IndexedDB  → stores the DATA (drafts, photos, outbox, form config) — see src/offline/
 *
 * How files get stored:
 *   After the form page loads, it sends this worker the list of files it just used
 *   (message "CACHE_FILES", see src/offline/serviceWorkerSetup.js). Only those files are kept.
 *   No hand-written file list, so new files in src/ are picked up automatically.
 *
 * How requests are answered ("network first"):
 *   - Stored file: ask the network for the newest version (and update the stored copy).
 *     If there is no answer within 4 seconds, or no connection at all, use the stored copy.
 *   - Anything else (API calls, other sites): passed straight to the network as usual.
 *
 * Scope: a service worker only controls pages in its own folder and below. Keep this file
 * in the same folder as the form page (or higher), or have the server send the header
 *   Service-Worker-Allowed: /
 */

/** Change the version to throw away all stored files on every device (e.g. after a big release). */
const CACHE_NAME = 'accurex-dynamic-form-v1';
const CACHE_PREFIX = 'accurex-dynamic-form-';

/** How long to wait for the network before using the stored copy (bad mobile signal on site). */
const NETWORK_TIMEOUT_MS = 4000;

// ───────────────────────────── Life cycle ─────────────────────────────

// Take over straight away instead of waiting until every open tab is closed.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        // Delete stored files from older versions of this worker.
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map(name => caches.delete(name)));

        // Start controlling pages that are already open.
        await self.clients.claim();
    })());
});

// ───────────────────────────── Storing files ─────────────────────────────

self.addEventListener('message', event => {
    if (event.data?.type === 'CACHE_FILES') {
        event.waitUntil(storeFiles(event.data.urls || []));
    }
});

/** Download and keep the given files. Files that are already stored are skipped. */
async function storeFiles(urls) {
    const cache = await caches.open(CACHE_NAME);
    const ourUrls = [...new Set(urls)].filter(isOnThisSite);

    await Promise.all(ourUrls.map(async url => {
        if (await cache.match(url)) return; // already stored; fetch events keep it up to date
        try {
            const response = await fetch(url);
            if (response.ok) await cache.put(url, response);
        } catch {
            // Could not download it now; it will be tried again on the next visit.
        }
    }));
}

// ───────────────────────────── Answering requests ─────────────────────────────

self.addEventListener('fetch', event => {
    const { request } = event;

    // Only simple downloads from this site. Everything else (form submissions,
    // other websites) is not touched: the browser handles it as normal.
    if (request.method !== 'GET' || !isOnThisSite(request.url)) return;

    event.respondWith(networkFirst(event));
});

async function networkFirst(event) {
    const { request } = event;
    const isPage = request.mode === 'navigate';
    const cache = await caches.open(CACHE_NAME);

    // For pages, ignore the "?..." part, so /form?case=123 still opens offline when /form?case=456 was stored.
    const storedResponse = await cache.match(request, { ignoreSearch: isPage });

    // Not one of our stored files: behave as if there were no service worker.
    if (!storedResponse) {
        return fetch(request).catch(() => (isPage ? offlinePage() : Response.error()));
    }

    // One of our files: try for a fresh copy and save it when it arrives.
    // cache: 'no-cache' makes the browser check with the server instead of trusting its own
    // HTTP cache, which may treat an old file as "still fresh" (unchanged files cost only a
    // tiny "304 Not Modified" reply). Pages are fetched as they are: browsers don't allow
    // changing options on a page navigation request.
    const fromNetwork = fetch(request, isPage ? undefined : { cache: 'no-cache' }).then(async response => {
        if (response.ok) await cache.put(request, response.clone());
        return response;
    });
    // Let the save finish even if we already answered from the stored copy.
    event.waitUntil(fromNetwork.catch(() => {}));

    try {
        const response = await withTimeout(fromNetwork, NETWORK_TIMEOUT_MS);
        return response.ok ? response : storedResponse;
    } catch {
        return storedResponse; // offline, or the network is too slow
    }
}

// ───────────────────────────── Helpers ─────────────────────────────

function isOnThisSite(url) {
    return new URL(url).origin === self.location.origin;
}

/** Reject if the promise takes longer than `ms`. */
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
}

/** Shown when a page that was never stored is opened without a connection. */
function offlinePage() {
    const html = `<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline</title>
<body style="font-family:system-ui,sans-serif;padding:24px;color:#182420">
<h1 style="font-size:18px">You're offline</h1>
<p>This page has not been opened on this device before, so there is no saved copy yet.
Open it once with a connection, then it will also work offline.</p>
</body>`;
    return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
