/**
 * Page side of the service worker (the worker itself is service-worker.js in the package root).
 *
 *   1. Register the service worker.
 *   2. When the page has finished loading, send the worker the list of files this page used
 *      (HTML, CSS, JavaScript, images), so it can keep copies for opening the page offline.
 *
 * Service workers only work on https:// pages (and on http://localhost for development).
 */

/**
 * Requests made by code (fetch / XMLHttpRequest) are DATA, not files: API calls, the form config.
 * Data is stored in IndexedDB instead, so these are left out.
 */
const DATA_REQUEST_TYPES = ['fetch', 'xmlhttprequest', 'beacon'];

let alreadySetUp = false;

/**
 * @param {string} serviceWorkerUrl  Where service-worker.js is, e.g. 'service-worker.js'
 */
export async function setUpOfflinePage(serviceWorkerUrl) {
    if (alreadySetUp) return; // render() can run more than once; once is enough
    alreadySetUp = true;

    if (!('serviceWorker' in navigator)) {
        console.info('DynamicFormRenderer: this browser has no service workers, so the page cannot open offline.');
        return;
    }

    try {
        await navigator.serviceWorker.register(serviceWorkerUrl);
        const registration = await navigator.serviceWorker.ready;

        await waitForPageLoad(); // so every image and stylesheet is in the list
        registration.active?.postMessage({ type: 'CACHE_FILES', urls: listFilesThisPageUses() });
    } catch (error) {
        // Typical causes: page not on https, or service-worker.js not found / outside the page's folder.
        console.warn('DynamicFormRenderer: could not set up opening this page offline.', error);
    }
}

/** This page's address plus every file the browser loaded for it. */
function listFilesThisPageUses() {
    const pageUrl = new URL(location.href);
    pageUrl.hash = '';

    const fileUrls = performance.getEntriesByType('resource')
        .filter(entry => !DATA_REQUEST_TYPES.includes(entry.initiatorType))
        .map(entry => entry.name)
        .filter(url => url.startsWith('http')); // skip blob: and data: addresses (photo previews)

    return [pageUrl.href, ...fileUrls];
}

function waitForPageLoad() {
    if (document.readyState === 'complete') return Promise.resolve();
    return new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
}
