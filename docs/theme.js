/**
 * Light / dark theme toggle, shared by the landing page, the docs portal and the code guide.
 *
 * How to use it on a page:
 *   1. Load it in <head> as a normal script (not type="module"):
 *        <script src="theme.js"></script>
 *      It must run before the page is drawn, so a saved dark theme never flashes white first.
 *   2. Give any button the attribute data-theme-toggle. This script fills in its icon and label.
 *   3. In the page's CSS, define colours for :root[data-theme="dark"] and :root[data-theme="light"].
 *
 * Without a saved choice, pages follow the system's light/dark setting.
 * The choice is saved in localStorage and shared by all pages on the site,
 * and a change in one open tab is applied to the others straight away.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'accurex-docs-theme';
    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    // Icons show the theme you will switch TO: a moon in light mode, a sun in dark mode.
    const MOON_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>';
    const SUN_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

    /** The saved choice, or null. localStorage can be blocked (private browsing), so never let it throw. */
    function readSavedTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved === 'light' || saved === 'dark' ? saved : null;
        } catch (error) {
            return null;
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (error) {
            // Not saved, but the page still switches for this visit.
        }
    }

    /** The theme the page shows right now: the saved choice, or else the system setting. */
    function currentTheme() {
        return root.dataset.theme || (systemPrefersDark.matches ? 'dark' : 'light');
    }

    function updateButtons() {
        const theme = currentTheme();
        const next = theme === 'dark' ? 'light' : 'dark';
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            button.innerHTML = theme === 'dark' ? SUN_ICON : MOON_ICON; // our own fixed icons, not user content
            button.setAttribute('aria-label', 'Switch to ' + next + ' theme');
            button.title = 'Switch to ' + next + ' theme';
        });
    }

    function toggleTheme() {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        root.dataset.theme = next;
        saveTheme(next);
        updateButtons();
    }

    // 1. Apply the saved choice immediately, before the page is drawn.
    const saved = readSavedTheme();
    if (saved) root.dataset.theme = saved;

    // 2. Wire up the buttons once they exist.
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', toggleTheme));
        updateButtons();
    });

    // 3. Keep icons right when the system setting changes, or another tab changes the theme.
    systemPrefersDark.addEventListener('change', updateButtons);
    window.addEventListener('storage', event => {
        if (event.key === STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) {
            root.dataset.theme = event.newValue;
            updateButtons();
        }
    });
})();
