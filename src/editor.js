import { EditorView, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { indentOnInput, bracketMatching, indentUnit, foldGutter, codeFolding, foldKeymap, foldAll, forceParsing } from '@codemirror/language';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { cmpSearch } from './search-panel.js';

import { buildPayload, stableId } from './build-info.js';
import { getSettings, onSettingsChange, saveSettings } from './settings.js';
import { detectLanguage, loadLanguageExtension, LANGUAGES } from './languages.js';
import { getTheme } from './themes.js';
import { buildToolbar, isMobileDevice } from './toolbar.js';
import { t, onLocaleChange } from './i18n.js';

const ATTACHED = new WeakSet();
const THEME_IDS = ['auto', 'one-dark', 'solarized-light', 'solarized-dark', 'github-light', 'github-dark', 'dracula'];

export function setupCodeMirror(target, dialog) {
    if (!target || !target.parentElement) return;
    if (ATTACHED.has(target)) return;
    ATTACHED.add(target);

    const settings = getSettings();
    const host = document.createElement('div');
    host.classList.add('codemirror-host', 'cmp--host');
    host.id = stableId('host');
    host.dataset.cmpBuild = buildPayload();
    host.dataset.author = 'aceenvw';
    host.setAttribute('role', 'textbox');
    host.setAttribute('aria-multiline', 'true');
    host.setAttribute('aria-label', t('cmp.a11y.editor'));

    target.classList.add('displayNone');
    target.parentElement.appendChild(host);

    if (dialog && dialog.classList) {
        dialog.classList.add('cmp--active-dialog');
    }

    // Compartments → live reconfigure via dispatch, no editor rebuild.
    const langComp = new Compartment();
    const themeComp = new Compartment();
    const wrapComp = new Compartment();
    const linesComp = new Compartment();
    const activeLineComp = new Compartment();
    const bracketComp = new Compartment();
    const closeBrComp = new Compartment();
    const fontComp = new Compartment();
    const indentComp = new Compartment();
    const foldComp = new Compartment();
    const autocompleteComp = new Compartment();

    const clampIndent = (n) => Math.max(1, Math.min(8, Number(n) || 4));
    const clampLineHeight = (n) => Math.max(1, Math.min(2.4, Number(n) || 1.5));

    const fontTheme = (px, lh) => EditorView.theme({
        '.cm-content': {
            fontSize: `${px}px`,
            fontFamily: 'var(--monoFontFamily)',
            lineHeight: String(clampLineHeight(lh)),
        },
        '.cm-gutters': { fontSize: `${px}px`, fontFamily: 'var(--monoFontFamily)' },
    });

    const indentExt = (n) => {
        const size = clampIndent(n);
        return [indentUnit.of(' '.repeat(size)), EditorState.tabSize.of(size)];
    };
    const foldExt = (on) => (on ? [codeFolding(), foldGutter()] : []);
    const autocompleteExt = (on) => (on ? autocompletion() : []);

    let syncing = false;

    const initialLang = detectLanguage(target, settings);
    host.dataset.cmpLang = initialLang;

    const editor = new EditorView({
        doc: target.value,
        extensions: [
            highlightSpecialChars(),
            history(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            highlightSelectionMatches(),
            cmpSearch(),
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                indentWithTab,
            ]),
            linesComp.of(settings.lineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
            activeLineComp.of(settings.highlightActiveLine ? highlightActiveLine() : []),
            bracketComp.of(settings.bracketMatching ? bracketMatching() : []),
            closeBrComp.of(settings.closeBrackets ? closeBrackets() : []),
            wrapComp.of(settings.lineWrap ? EditorView.lineWrapping : []),
            indentComp.of(indentExt(settings.indentSize)),
            foldComp.of(foldExt(settings.codeFolding)),
            autocompleteComp.of(autocompleteExt(settings.autocomplete)),
            themeComp.of(getTheme(settings.theme).extension),
            fontComp.of(fontTheme(settings.fontSize || 14, settings.lineHeight)),
            langComp.of([]),
            EditorView.updateListener.of((update) => {
                if (update.docChanged && !syncing) {
                    syncing = true;
                    try {
                        target.value = update.state.doc.toString();
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                    } finally {
                        syncing = false;
                    }
                }
                if (update.selectionSet || update.docChanged) {
                    toolbar?.updateStatus?.();
                }
                if (update.transactions.length) toolbar?.syncSearchState?.();
            }),
        ],
        parent: host,
    });

    // foldAll only folds already-parsed regions, and parsing is incremental, so a
    // large doc would fold only its top. Parse briefly then fold; if unfinished,
    // parse the tail in idle slices and fold once at the end (one tree walk, off
    // the interaction path). Budgets bound the work so the open never blocks.
    const FOLD_FIRST_BUDGET_MS = 30;
    const FOLD_IDLE_BUDGET_MS = 16;
    const FOLD_MAX_IDLE_PASSES = 40;
    let foldTimer = 0;
    let foldCancel = null;

    const maybeFoldOnOpen = () => {
        const s = getSettings();
        if (!s.codeFolding || !s.foldOnOpen) return;
        requestAnimationFrame(() => {
            try {
                const done = forceParsing(editor, editor.state.doc.length, FOLD_FIRST_BUDGET_MS);
                foldAll(editor);
                if (!done) scheduleRemainingFold();
            } catch { /* ignore */ }
        });
    };

    const scheduleRemainingFold = () => {
        const idle = globalThis.requestIdleCallback || ((fn) => { foldTimer = setTimeout(fn, 1); });
        const cancelIdle = globalThis.cancelIdleCallback || ((id) => clearTimeout(id));
        let passes = 0;
        const step = () => {
            if (!editor.dom.isConnected) return;
            let done = false;
            try { done = forceParsing(editor, editor.state.doc.length, FOLD_IDLE_BUDGET_MS); }
            catch { return; }
            if (done || ++passes >= FOLD_MAX_IDLE_PASSES) {
                try { foldAll(editor); } catch { /* ignore */ }
                return;
            }
            foldTimer = idle(step);
        };
        foldTimer = idle(step);
        foldCancel = () => { try { cancelIdle(foldTimer); } catch { /* ignore */ } };
    };

    let currentLang = initialLang;
    loadLanguageExtension(initialLang).then(ext => {
        if (ext) editor.dispatch({ effects: langComp.reconfigure(ext) });
        maybeFoldOnOpen();
    }).catch(() => {});

    // Place the cursor at the start and focus after first paint.
    requestAnimationFrame(() => {
        editor.dispatch({ selection: { anchor: 0, head: 0 } });
        editor.focus();
    });

    // The dialog measures mid open-animation against a non-final height. Remeasure
    // once the animation settles so the first paint isn't cramped.
    if (dialog) {
        const remeasure = () => {
            editor.requestMeasure();
            editor.dispatch({ selection: { anchor: 0, head: 0 } });
        };
        let done = false;
        const settle = () => { if (done) return; done = true; remeasure(); };
        // animationend = open finished; timeout covers no-animation/reduced-motion.
        dialog.addEventListener('animationend', settle, { once: true });
        setTimeout(settle, 350);
    }

    const toolbar = buildToolbar({
        editor,
        dialog: dialog || host,
        settings,
        getLanguage: () => currentLang,
        onSettingsClick: () => openQuickSettings(editor, host, dialog, applyLiveSettings),
        // Persist the fullscreen choice only when the "remember" option is enabled.
        onFullscreenChange: (on) => {
            if (getSettings().rememberFullscreen) saveSettings({ fullscreenState: on });
        },
        onLanguageClick: (anchor) => openLangPicker(anchor, currentLang, async (id) => {
            currentLang = id;
            host.dataset.cmpLang = id;
            const ext = await loadLanguageExtension(id);
            editor.dispatch({ effects: langComp.reconfigure(ext || []) });
            toolbar.updateLangChip();
        }),
    });

    const showToolbar = settings.toolbar?.show !== false
        && (isMobileDevice() ? settings.mobileToolbar !== false : true);
    if (showToolbar) {
        if ((settings.toolbar?.position || 'top') === 'bottom') host.appendChild(toolbar.root);
        else host.insertBefore(toolbar.root, host.firstChild);
    }
    if (toolbar.status) {
        const strip = document.createElement('div');
        strip.className = 'cmp--statusbar';
        strip.appendChild(toolbar.status);
        host.appendChild(strip);
    }

    // Open fullscreen if: remembered state is on, or mobile auto-fullscreen is set.
    // Use the toolbar's setter so inline styles + button visuals stay in sync;
    // notify:false so restoring doesn't re-write the same setting.
    if (dialog) {
        const wantFs = (settings.rememberFullscreen && settings.fullscreenState)
            || (isMobileDevice() && settings.fullscreenOnMobile);
        if (wantFs) toolbar.setFullscreen?.(true, { notify: false });
    }

    toolbar.syncSearchState();

    const applyLiveSettings = (next) => {
        editor.dispatch({
            effects: [
                themeComp.reconfigure(getTheme(next.theme).extension),
                wrapComp.reconfigure(next.lineWrap ? EditorView.lineWrapping : []),
                linesComp.reconfigure(next.lineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
                activeLineComp.reconfigure(next.highlightActiveLine ? highlightActiveLine() : []),
                bracketComp.reconfigure(next.bracketMatching ? bracketMatching() : []),
                closeBrComp.reconfigure(next.closeBrackets ? closeBrackets() : []),
                indentComp.reconfigure(indentExt(next.indentSize)),
                foldComp.reconfigure(foldExt(next.codeFolding)),
                autocompleteComp.reconfigure(autocompleteExt(next.autocomplete)),
                fontComp.reconfigure(fontTheme(next.fontSize || 14, next.lineHeight)),
            ],
        });
    };
    const offSettings = onSettingsChange(applyLiveSettings);
    const offLocale = onLocaleChange(() => {
        host.setAttribute('aria-label', t('cmp.a11y.editor'));
    });

    // Remeasure on later size changes (fullscreen, mobile keyboard). rAF-coalesced
    // so bursts cost one measure/frame; disconnected on teardown.
    let resizeObs = null;
    if (typeof ResizeObserver === 'function') {
        let pending = false;
        resizeObs = new ResizeObserver(() => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => { pending = false; editor.requestMeasure(); });
        });
        resizeObs.observe(host);
    }

    // Final flush to the source textarea on close, in case a last input event
    // didn't fire (no lost edits regardless of how the dialog was dismissed).
    const syncToTarget = () => {
        try {
            const text = editor.state.doc.toString();
            if (target.value === text) return;
            syncing = true;
            target.value = text;
            target.dispatchEvent(new Event('input', { bubbles: true }));
        } catch { /* ignore */ } finally {
            syncing = false;
        }
    };

    // Teardown on <dialog> close or DOM detach.
    const cleanup = () => {
        syncToTarget();
        try { foldCancel?.(); } catch { /* ignore */ }
        try { resizeObs?.disconnect(); } catch { /* ignore */ }
        try { editor.destroy(); } catch { /* ignore */ }
        offSettings?.();
        offLocale?.();
        toolbar?.destroy?.();
        ATTACHED.delete(target);
    };

    if (dialog) {
        dialog.addEventListener('close', cleanup, { once: true });
        const disconnectObs = new MutationObserver(() => {
            if (!dialog.isConnected) { cleanup(); disconnectObs.disconnect(); }
        });
        disconnectObs.observe(dialog.parentNode || document.body, { childList: true, subtree: false });
    }

    return { editor, host, toolbar, cleanup };
}

function openQuickSettings(editor, host, dialog, applyFn) {
    const existing = host.querySelector('.cmp--quick-settings');
    if (existing) { existing.remove(); return; }

    const pop = document.createElement('div');
    pop.className = 'cmp--quick-settings';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', t('cmp.toolbar.settings'));
    // Static template; zero user-interpolated values (XSS-safe).
    pop.innerHTML = `
        <div class="cmp--qs-header">
            <i class="fa-solid fa-sliders"></i>
            <span data-i18n="cmp.settings.quick_title"></span>
        </div>

        <label class="cmp--row">
            <span data-i18n="cmp.settings.line_numbers"></span>
            <span class="cmp--qs-switch">
                <input type="checkbox" data-qs="lineNumbers" />
                <span class="cmp--qs-track"><span class="cmp--qs-thumb"></span></span>
            </span>
        </label>

        <label class="cmp--row">
            <span data-i18n="cmp.settings.line_wrap"></span>
            <span class="cmp--qs-switch">
                <input type="checkbox" data-qs="lineWrap" />
                <span class="cmp--qs-track"><span class="cmp--qs-thumb"></span></span>
            </span>
        </label>

        <label class="cmp--row">
            <span data-i18n="cmp.settings.code_folding"></span>
            <span class="cmp--qs-switch">
                <input type="checkbox" data-qs="codeFolding" />
                <span class="cmp--qs-track"><span class="cmp--qs-thumb"></span></span>
            </span>
        </label>

        <label class="cmp--row">
            <span data-i18n="cmp.settings.fold_on_open"></span>
            <span class="cmp--qs-switch">
                <input type="checkbox" data-qs="foldOnOpen" />
                <span class="cmp--qs-track"><span class="cmp--qs-thumb"></span></span>
            </span>
        </label>

        <label class="cmp--row">
            <span data-i18n="cmp.settings.autocomplete"></span>
            <span class="cmp--qs-switch">
                <input type="checkbox" data-qs="autocomplete" />
                <span class="cmp--qs-track"><span class="cmp--qs-thumb"></span></span>
            </span>
        </label>

        <div class="cmp--row">
            <span data-i18n="cmp.settings.font_size"></span>
            <span class="cmp--qs-slider-wrap">
                <input type="range" class="cmp--qs-slider" min="10" max="28" step="1" data-qs="fontSize" />
                <span class="cmp--qs-chip" data-qs-out="fontSize">14</span>
            </span>
        </div>

        <div class="cmp--row">
            <span data-i18n="cmp.settings.line_height"></span>
            <span class="cmp--qs-slider-wrap">
                <input type="range" class="cmp--qs-slider" min="1" max="2.4" step="0.1" data-qs="lineHeight" />
                <span class="cmp--qs-chip" data-qs-out="lineHeight">1.5</span>
            </span>
        </div>

        <label class="cmp--row">
            <span data-i18n="cmp.settings.theme"></span>
            <select data-qs="theme">
                <option value="auto"></option>
                <option value="one-dark">One Dark</option>
                <option value="solarized-light">Solarized Light</option>
                <option value="solarized-dark">Solarized Dark</option>
                <option value="github-light">GitHub Light</option>
                <option value="github-dark">GitHub Dark</option>
                <option value="dracula">Dracula</option>
            </select>
        </label>
    `;

    const themeSel = pop.querySelector('[data-qs="theme"]');
    // Localize both the "Follow SillyTavern" option and all data-i18n spans
    const refreshLabels = () => {
        pop.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
        themeSel.options[0].textContent = t('cmp.settings.theme_auto');
    };
    refreshLabels();

    // Write current settings into the controls
    const syncFromSettings = (s) => {
        const fsz = Math.max(10, Math.min(28, Number(s.fontSize) || 14));
        const lh = Math.max(1, Math.min(2.4, Number(s.lineHeight) || 1.5));
        pop.querySelector('[data-qs="lineNumbers"]').checked = !!s.lineNumbers;
        pop.querySelector('[data-qs="lineWrap"]').checked = !!s.lineWrap;
        pop.querySelector('[data-qs="codeFolding"]').checked = !!s.codeFolding;
        pop.querySelector('[data-qs="foldOnOpen"]').checked = !!s.foldOnOpen;
        pop.querySelector('[data-qs="autocomplete"]').checked = !!s.autocomplete;
        const slider = pop.querySelector('[data-qs="fontSize"]');
        slider.value = String(fsz);
        pop.querySelector('[data-qs-out="fontSize"]').textContent = String(fsz);
        const lhSlider = pop.querySelector('[data-qs="lineHeight"]');
        lhSlider.value = String(lh);
        pop.querySelector('[data-qs-out="lineHeight"]').textContent = lh.toFixed(1);
        themeSel.value = THEME_IDS.includes(s.theme) ? s.theme : 'auto';
    };
    syncFromSettings(getSettings());

    // Committed changes (checkbox toggle, select change, slider release)
    pop.addEventListener('change', (ev) => {
        const el = ev.target;
        const key = el.getAttribute('data-qs');
        if (!key) return;
        const v = el.type === 'checkbox' ? el.checked
            : (el.type === 'number' || el.type === 'range') ? Number(el.value)
            : el.value;
        applyFn(saveSettings({ [key]: v }));
    });

    // Live slider dragging — push intermediate values so the editor updates in real time
    pop.addEventListener('input', (ev) => {
        const el = ev.target;
        if (!(el instanceof HTMLInputElement) || el.type !== 'range') return;
        const key = el.getAttribute('data-qs');
        if (!key) return;
        const v = Number(el.value);
        const out = pop.querySelector(`[data-qs-out="${key}"]`);
        if (out) out.textContent = String(v);
        applyFn(saveSettings({ [key]: v }));
    });

    // Keep popover in sync if the main ST drawer changes these same settings
    const offSync = onSettingsChange((s) => syncFromSettings(s));

    // Swallow clicks so the outside-click handler doesn't close us
    pop.addEventListener('click', e => e.stopPropagation());

    host.appendChild(pop);

    const close = () => {
        offSync?.();
        pop.remove();
        document.removeEventListener('mousedown', off, true);
        document.removeEventListener('keydown', onEsc, true);
    };
    const off = (e) => { if (!pop.contains(e.target)) close(); };
    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    setTimeout(() => {
        document.addEventListener('mousedown', off, true);
        document.addEventListener('keydown', onEsc, true);
    }, 0);
}

function openLangPicker(anchor, current, onPick) {
    const menu = document.createElement('div');
    menu.className = 'cmp--lang-menu';
    menu.setAttribute('role', 'menu');
    LANGUAGES.forEach(id => {
        const item = document.createElement('button');
        item.type = 'button';
        item.setAttribute('role', 'menuitem');
        item.className = 'cmp--lang-item' + (id === current ? ' cmp--active' : '');
        item.textContent = id === 'plain' ? t('cmp.settings.language_plain') : id.toUpperCase();
        if (id === current) item.setAttribute('aria-current', 'true');
        item.addEventListener('click', (e) => {
            e.preventDefault();
            close();
            onPick(id);
        });
        menu.appendChild(item);
    });
    document.body.appendChild(menu);

    // Viewport-safe: flip above anchor / shift left on overflow.
    const rect = anchor.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    let top = rect.bottom + 6;
    let left = rect.left;
    if (left + m.width > innerWidth - 8) left = Math.max(8, innerWidth - m.width - 8);
    if (top + m.height > innerHeight - 8) top = Math.max(8, rect.top - m.height - 6);
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    const close = () => {
        menu.remove();
        document.removeEventListener('mousedown', off, true);
        document.removeEventListener('keydown', onEsc, true);
    };
    const off = (e) => {
        if (!menu.contains(e.target) && e.target !== anchor) close();
    };
    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    setTimeout(() => {
        document.addEventListener('mousedown', off, true);
        document.addEventListener('keydown', onEsc, true);
    }, 0);
}
