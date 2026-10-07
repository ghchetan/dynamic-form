/**
 * Small helpers for talking to the server.
 */

/** Thrown when the server answers with an error code (404, 500, ...). */
export class HttpError extends Error {
    constructor(status) {
        super(`HTTP ${status}`);
        this.name = 'HttpError';
        this.status = status;
    }
}

/** Server answers that mean "try again later" (server busy, down, or timed out). */
const TEMPORARY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Is it worth trying this request again later?
 *   yes → no connection, or the server is temporarily unavailable
 *   no  → the server refused the request (e.g. 400 Bad Request); retrying gives the same answer
 */
export function isTemporaryFailure(error) {
    // fetch() throws a TypeError when it cannot reach the server at all (no network).
    if (error instanceof TypeError) return true;
    if (error instanceof HttpError) return TEMPORARY_STATUS_CODES.includes(error.status);
    return false;
}

/**
 * Send a request described by a plain object.
 * Plain objects (not Request instances) can be stored in IndexedDB and sent again later.
 *
 * @param {{ url: string, method?: string, headers?: object, body?: string }} request
 * @returns {Promise<object|null>} The JSON response, or null when the server sends no JSON.
 * @throws {HttpError|TypeError}
 */
export async function sendRequest({ url, method = 'GET', headers = {}, body }) {
    const response = await fetch(url, { method, headers, body });
    if (!response.ok) throw new HttpError(response.status);

    const isJson = response.headers.get('content-type')?.includes('application/json');
    return isJson ? response.json() : null;
}

/** Turn `config.submission` + the form data into a request object for sendRequest(). */
export function buildSubmitRequest(submission, data) {
    return {
        url: submission.url,
        method: submission.method || 'POST',
        headers: {
            'Content-Type': submission.contentType || 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify(data),
    };
}
