// ⊹ CODE MIRROR PRO ⊹ — entry point.
// Fork of SillyTavern/Extension-CodeMirror (Cohee1207). Author: aceenvw.
import './style.css';

import { setupCodeMirror } from './editor.js';
import { loadSettings, mountSettingsPanel, onSettingsChange } from './settings.js';
import { registerDict, setLocale, detectLocale } from './i18n.js';
import { META } from './build-info.js';

import enUS from '../i18n/en-us.json';
import ruRU from '../i18n/ru-ru.json';

registerDict('en-us', enUS);
registerDict('ru-ru', ruRU);

const STATE = {
    observer: null,
    settingsMounted: false,
    ready: false,
};

function applyLocaleFromSettings() {
    const s = loadSettings();
    setLocale(detectLocale(s.locale));
}

function processAddedNode(node) {
    if (!(node instanceof HTMLElement)) return;

    const dialogs = [];
    if (node instanceof HTMLDialogElement) dialogs.push(node);
    else node.querySelectorAll?.('dialog')?.forEach?.(d => dialogs.push(d));

    for (const dialog of dialogs) {
        const target = dialog.querySelector('textarea.maximized_textarea');
        if (target && !target.classList.contains('displayNone')) {
            setupCodeMirror(target, dialog);
        }
    }
}

function startObserver() {
    if (STATE.observer) return;
    STATE.observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            m.addedNodes.forEach(processAddedNode);
        }
    });
    STATE.observer.observe(document.body, { childList: true, subtree: true });

    // Catch dialogs already mounted before observer started.
    document.querySelectorAll('dialog').forEach(processAddedNode);
}

function stopObserver() {
    STATE.observer?.disconnect();
    STATE.observer = null;
}

function tryMountSettings() {
    if (STATE.settingsMounted) return;
    const root = mountSettingsPanel();
    if (root) STATE.settingsMounted = true;
}

function init() {
    if (STATE.ready) return;
    STATE.ready = true;

    loadSettings();
    applyLocaleFromSettings();

    startObserver();
    tryMountSettings();

    // Retry: ST's #extensions_settings may not exist on first tick.
    let retries = 0;
    const timer = setInterval(() => {
        tryMountSettings();
        if (STATE.settingsMounted || ++retries > 40) clearInterval(timer);
    }, 500);

    onSettingsChange(() => applyLocaleFromSettings());

    window.addEventListener('pagehide', stopObserver, { once: true });
}

// Multi-trigger init. Idempotent via STATE.ready guard.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
try {
    const ctx = globalThis.SillyTavern?.getContext?.();
    const ev = ctx?.eventSource;
    const types = ctx?.event_types || ctx?.eventTypes;
    if (ev && types?.APP_READY) ev.on(types.APP_READY, init);
} catch { /* ignore */ }

// Debug handle. Frozen; no non-configurable props (cleanup-friendly).
try {
    globalThis.CodeMirrorPro = Object.freeze({
        version: META.version,
        author: META.author,
        stopObserver,
    });
} catch { /* ignore */ }
