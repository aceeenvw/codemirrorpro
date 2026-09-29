// ⊹ CODE MIRROR PRO ⊹ — entry point.
// Fork of SillyTavern/Extension-CodeMirror (Cohee1207). Author: aceenvw.
import './style.css';

import { setupCodeMirror } from './editor.js';
import { loadSettings, mountSettingsPanel, onSettingsChange } from './settings.js';
import { registerDict, setLocale, detectLocale } from './i18n.js';
import { META } from './build-info.js';
import { createScope } from './lifecycle.js';

import enUS from '../i18n/en-us.json';
import ruRU from '../i18n/ru-ru.json';

registerDict('en-us', enUS);
registerDict('ru-ru', ruRU);

const STATE = {
    observer: null,
    settingsRoot: null,
    ready: false,
};
const scope = createScope();
const editors = new Map();

function applyLocaleFromSettings() {
    const s = loadSettings();
    setLocale(detectLocale(s.locale));
}

function processAddedNode(node) {
    if (!scope.alive) return;
    if (!(node instanceof HTMLElement)) return;
    if (node.closest('.cmp--host, .cmp--settings')) return;
    const targets = node.matches('textarea.maximized_textarea') ? [node]
        : node.querySelectorAll('textarea.maximized_textarea');
    for (const target of targets) {
        const dialog = target.closest('dialog');
        if (!dialog || editors.has(target) || target.classList.contains('displayNone')) continue;
        const handle = setupCodeMirror(target, dialog, { onCleanup: () => editors.delete(target) });
        if (handle) editors.set(target, { ...handle, dialog });
    }
}

function startObserver() {
    if (STATE.observer || !scope.alive) return;
    STATE.observer = new MutationObserver((mutations) => {
        let removed = false;
        for (const m of mutations) {
            m.addedNodes.forEach(processAddedNode);
            if (m.removedNodes.length) removed = true;
        }
        if (removed) {
            for (const [target, handle] of editors) {
                if (!target.isConnected || !handle.dialog.isConnected) handle.cleanup();
            }
        }
        if (!STATE.settingsRoot?.isConnected) tryMountSettings();
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
    if (!scope.alive || STATE.settingsRoot?.isConnected) return;
    STATE.settingsRoot?.cmpCleanup?.();
    STATE.settingsRoot = mountSettingsPanel();
}

function init() {
    if (STATE.ready || !scope.alive) return;
    STATE.ready = true;

    loadSettings();
    applyLocaleFromSettings();

    startObserver();
    tryMountSettings();

    scope.defer(onSettingsChange(() => applyLocaleFromSettings()));
}

// Multi-trigger init. Idempotent via STATE.ready guard.
if (document.readyState === 'loading') {
    scope.listen(document, 'DOMContentLoaded', init, { once: true });
} else {
    init();
}
try {
    const ctx = globalThis.SillyTavern?.getContext?.();
    const ev = ctx?.eventSource;
    const types = ctx?.eventTypes || ctx?.event_types;
    if (ev && types?.APP_READY) {
        ev.on(types.APP_READY, init);
        scope.defer(() => ev.removeListener(types.APP_READY, init));
    }
} catch { /* ignore */ }

const closeEditors = () => { for (const handle of editors.values()) handle.cleanup(); };
scope.listen(window, 'pagehide', () => { stopObserver(); closeEditors(); });
scope.listen(window, 'pageshow', () => { if (STATE.ready) { startObserver(); tryMountSettings(); } });
const cleanup = () => {
    scope.destroy();
    stopObserver();
    closeEditors();
    STATE.settingsRoot?.cmpCleanup?.();
    STATE.settingsRoot?.remove();
    if (globalThis.CodeMirrorPro?.cleanup === cleanup) delete globalThis.CodeMirrorPro;
};

try {
    globalThis.CodeMirrorPro = Object.freeze({
        version: META.version,
        author: META.author,
        stopObserver,
        cleanup,
    });
} catch { /* ignore */ }
