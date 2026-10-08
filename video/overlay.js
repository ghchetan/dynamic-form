/**
 * Video overlay — injected into every page while the tutorial videos are recorded (see build.mjs).
 *
 * Adds three things a screen recording needs and a real browser doesn't show:
 *   - a visible mouse cursor, with a ripple on every click
 *   - a spotlight: dims the page except the element the narration is talking about
 *   - a small "browser console" panel that types a command and prints its real result
 *
 * The recording script drives them through window.__tour. Nothing here is used by the product.
 */
(function () {
    'use strict';
    if (window.__tour) return;

    const CSS = `
        #__tour-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none;
            width: 22px; height: 22px; transform: translate(-100px, -100px); transition: transform 0.06s linear; }
        .__tour-ripple { position: fixed; z-index: 2147483646; pointer-events: none; width: 34px; height: 34px;
            margin: -17px 0 0 -17px; border-radius: 50%; border: 3px solid #1d5fa6; opacity: 0.9;
            animation: __tour-ripple 0.5s ease-out forwards; }
        @keyframes __tour-ripple { to { transform: scale(1.8); opacity: 0; } }
        #__tour-spotlight { position: absolute; z-index: 2147483640; pointer-events: none; border-radius: 10px;
            border: 3px solid #1d5fa6; box-shadow: 0 0 0 9999px rgba(10, 16, 28, 0.32), 0 0 0 6px rgba(29, 95, 166, 0.18);
            transition: all 0.35s ease; }
        #__tour-console { position: fixed; right: 24px; bottom: 24px; z-index: 2147483645; width: 600px; max-height: 260px;
            overflow: hidden; padding: 14px 16px; border-radius: 10px; background: #0d1117; color: #e6edf3;
            border: 1px solid #30363d; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
            font: 15px/1.55 "Geist Mono", ui-monospace, Menlo, monospace; white-space: pre-wrap; word-break: break-word; }
        #__tour-console .title { display: block; margin-bottom: 8px; color: #8b949e; font: 600 12px/1 system-ui, sans-serif;
            letter-spacing: 0.06em; text-transform: uppercase; }
        #__tour-console .prompt { color: #58a6ff; }
        #__tour-console .result { color: #7ee787; }
    `;

    function whenBodyReady(callback) {
        if (document.body) callback();
        else document.addEventListener('DOMContentLoaded', callback, { once: true });
    }

    whenBodyReady(() => {
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.append(style);

        const cursor = document.createElement('div');
        cursor.id = '__tour-cursor';
        cursor.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.4 L18 13.4 Z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
        document.body.append(cursor);

        document.addEventListener('mousemove', event => {
            cursor.style.transform = `translate(${event.clientX - 3}px, ${event.clientY - 2}px)`;
        }, true);
        document.addEventListener('mousedown', event => {
            const ripple = document.createElement('div');
            ripple.className = '__tour-ripple';
            ripple.style.left = event.clientX + 'px';
            ripple.style.top = event.clientY + 'px';
            document.body.append(ripple);
            setTimeout(() => ripple.remove(), 600);
        }, true);
    });

    function find(target) {
        return typeof target === 'string' ? document.querySelector(target) : target;
    }

    window.__tour = {
        /** Dim everything except one element. Pass several selectors to cover them all with one box. */
        spotlight(targets, padding = 8) {
            const elements = [].concat(targets).map(find).filter(Boolean);
            if (!elements.length) throw new Error('spotlight: nothing matches ' + targets);
            const rects = elements.map(element => element.getBoundingClientRect());
            const left = Math.min(...rects.map(rect => rect.left)) - padding;
            const top = Math.min(...rects.map(rect => rect.top)) - padding;
            const right = Math.max(...rects.map(rect => rect.right)) + padding;
            const bottom = Math.max(...rects.map(rect => rect.bottom)) + padding;

            let box = document.getElementById('__tour-spotlight');
            if (!box) {
                box = document.createElement('div');
                box.id = '__tour-spotlight';
                document.body.append(box);
            }
            Object.assign(box.style, {
                left: left + window.scrollX + 'px', top: top + window.scrollY + 'px',
                width: right - left + 'px', height: bottom - top + 'px',
            });
        },

        clear() {
            document.getElementById('__tour-spotlight')?.remove();
        },

        /** Type a command into the fake console, run it for real, and print the result. */
        async console(command) {
            let panel = document.getElementById('__tour-console');
            if (!panel) {
                panel = document.createElement('div');
                panel.id = '__tour-console';
                panel.innerHTML = '<span class="title">Browser console</span>';
                document.body.append(panel);
            }
            const line = document.createElement('div');
            line.innerHTML = '<span class="prompt">&gt; </span>';
            panel.append(line);
            for (const character of command) {
                line.append(character);
                await new Promise(resolve => setTimeout(resolve, 45));
            }
            await new Promise(resolve => setTimeout(resolve, 350));
            let result;
            try {
                const value = (0, eval)(command); // indirect eval: runs in the page, like the real console
                result = value === undefined ? 'undefined' : JSON.stringify(value, null, 1).replace(/\n\s*/g, ' ');
                if (result.length > 160) result = result.slice(0, 157) + '…';
            } catch (error) {
                result = String(error);
            }
            const output = document.createElement('div');
            output.className = 'result';
            output.textContent = result;
            panel.append(output);
        },
    };
})();
