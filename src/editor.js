import { EditorView, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { indentOnInput, bracketMatching, indentUnit, foldGutter, codeFolding, foldKeymap, foldAll, forceParsing } from '@codemirror/language';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { cmpSearch } from './search-panel.js';

import { buildPayload, stableId } from './build-info.js';
import { getSettings, onSettingsChange, saveSettings } from './settings.js';
import { detectLanguage, loadLanguageExtension, LANGUAGES, getFieldPurpose } from './languages.js';
import { getTheme, watchHostTheme } from './themes.js';
import { buildToolbar, isMobileDevice } from './toolbar.js';
import { t, onLocaleChange, ownTranslations, translateElements } from './i18n.js';
import { createScope } from './lifecycle.js';
import { THEME_IDS } from './options.js';
import { bindPopover } from './popover.js';
import { createMacroSource, macroEligible, macroExtensions } from './macros.js';
import { FORMATS, formatSelection, markdownHotkeys } from './markdown.js';
import { profileFor, resolveProfile, profileLanguage } from './profiles.js';
import { fail } from './log.js';

const ATTACHED = new WeakSet();

export function setupCodeMirror(target, dialog, { onCleanup } = {}) {
    if (!target || !target.parentElement) return;
    if (ATTACHED.has(target)) return;
    ATTACHED.add(target);

    const scope = createScope();
    let editor;
    let toolbar;
    let closePopover = null;
    let languageRequest = 0;
    const wasHidden = target.classList.contains('displayNone');
    const hadDialogClass = dialog?.classList.contains('cmp--active-dialog');
    let host;
    scope.defer(() => editor?.destroy());
    scope.defer(() => toolbar?.destroy());
    const cleanup = () => {
        if (!scope.alive) return;
        closePopover?.(false);
        scope.destroy();
        host?.remove();
        if (!wasHidden) target.classList.remove('displayNone');
        if (!hadDialogClass) dialog?.classList.remove('cmp--active-dialog');
        ATTACHED.delete(target);
        onCleanup?.();
    };

    try {

    const purpose = getFieldPurpose(target);
    let profileChoice = 'auto';
    let languageChosen = false;
    const settings = resolveProfile(getSettings(), purpose, profileChoice);
    host = document.createElement('div');
    host.classList.add('codemirror-host', 'cmp--host');
    host.id = stableId('host');
    host.dataset.cmpBuild = buildPayload();
    host.dataset.author = 'aceenvw';

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
            fontSize: `${isMobileDevice() ? Math.max(16, px) : px}px`,
            fontFamily: 'var(--monoFontFamily)',
            lineHeight: String(clampLineHeight(lh)),
        },
        '.cm-gutters': { fontSize: `${isMobileDevice() ? Math.max(16, px) : px}px`, fontFamily: 'var(--monoFontFamily)' },
    });

    const indentExt = (n) => {
        const size = clampIndent(n);
        return [indentUnit.of(' '.repeat(size)), EditorState.tabSize.of(size)];
    };
    const foldExt = (on) => (on ? [codeFolding(), foldGutter()] : []);
    const macroSource = createMacroSource(target);
    const autocompleteExt = (on) => on ? autocompletion()
        : macroEligible(target) ? autocompletion({ override: [macroSource] }) : [];

    let syncing = false;

    const initialLang = profileLanguage(settings, purpose, profileChoice, detectLanguage(target, settings));
    host.dataset.cmpLang = initialLang;

    editor = new EditorView({
        doc: target.value,
        extensions: [
            highlightSpecialChars(),
            history(),
            drawSelection(),
            dropCursor(),
            EditorView.contentAttributes.of({ 'aria-label': t('cmp.a11y.editor') }),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            highlightSelectionMatches(),
            cmpSearch(),
            macroExtensions(target, macroSource),
            markdownHotkeys(target),
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
                        target.setSelectionRange(update.state.selection.main.from, update.state.selection.main.to);
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                    } finally {
                        syncing = false;
                    }
                }
                if (update.selectionSet || update.docChanged) {
                    toolbar?.updateStatus?.();
                }
                if (update.docChanged) toolbar?.invalidateTokenCount();
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
        const s = resolveProfile(getSettings(), purpose, profileChoice);
        if (!s.codeFolding || !s.foldOnOpen) return;
        const doc = editor.state.doc;
        scope.frame(() => {
            if (!resolveProfile(getSettings(), purpose, profileChoice).codeFolding || editor.state.doc !== doc) return;
            try {
                const done = forceParsing(editor, editor.state.doc.length, FOLD_FIRST_BUDGET_MS);
                foldAll(editor);
                if (!done) scheduleRemainingFold(doc);
            } catch { /* ignore */ }
        });
    };

    const scheduleRemainingFold = (doc) => {
        foldCancel?.();
        const idle = globalThis.requestIdleCallback || ((fn) => setTimeout(fn, 1));
        const cancelIdle = globalThis.cancelIdleCallback || ((id) => clearTimeout(id));
        let passes = 0;
        const step = () => {
            if (!scope.alive || !editor.dom.isConnected || !resolveProfile(getSettings(), purpose, profileChoice).codeFolding || editor.state.doc !== doc) return;
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
    let desiredLanguage = initialLang;
    const setLanguage = async (id, fold = false) => {
        desiredLanguage = id;
        const request = ++languageRequest;
        const ext = await loadLanguageExtension(id);
        if (!scope.alive || request !== languageRequest) return;
        currentLang = id;
        host.dataset.cmpLang = id;
        editor.dispatch({ effects: langComp.reconfigure(ext || []) });
        toolbar?.updateLangChip();
        if (fold) maybeFoldOnOpen();
    };
    setLanguage(initialLang, true);

    // Focus after first paint without changing the current selection.
    scope.frame(() => {
        editor.focus();
    });

    // The dialog measures mid open-animation against a non-final height. Remeasure
    // once the animation settles so the first paint isn't cramped.
    if (dialog) {
        let done = false;
        const settle = (event) => {
            if (done || (event && event.target !== dialog)) return;
            done = true;
            editor.requestMeasure();
        };
        // animationend = open finished; timeout covers no-animation/reduced-motion.
        scope.listen(dialog, 'animationend', settle);
        scope.timeout(settle, 350);
    }

    const togglePopover = (kind, open) => {
        const same = closePopover?.alive && closePopover.kind === kind;
        closePopover?.(false);
        closePopover = same ? null : open();
        if (closePopover) closePopover.kind = kind;
    };
    toolbar = buildToolbar({
        editor,
        dialog: dialog || host,
        settings,
        getLanguage: () => currentLang,
        markdownEnabled: () => currentLang === 'markdown' || target.classList.contains('mdHotkeys') || getFieldPurpose(target) === 'prose',
        onFormatClick: (anchor) => togglePopover('format', () => openFormatPicker(host, anchor, editor)),
        getProfile: () => profileFor(getSettings(), purpose, profileChoice),
        onProfileClick: (anchor) => togglePopover('profile', () => openProfilePicker(host, anchor, profileChoice, (choice) => {
            profileChoice = choice;
            applyLiveSettings(getSettings());
        })),
        onSettingsClick: (anchor) => togglePopover('settings', () => openQuickSettings(host, anchor)),
        // Persist the fullscreen choice only when the "remember" option is enabled.
        onFullscreenChange: (on) => {
            if (getSettings().rememberFullscreen) saveSettings({ fullscreenState: on });
        },
        onLanguageClick: (anchor) => togglePopover('language', () => openLangPicker(host, anchor, currentLang, (id) => {
            languageChosen = true;
            setLanguage(id);
        })),
    });

    const placeToolbar = (next) => {
        toolbar.root.hidden = !next.toolbar.show || (isMobileDevice() && !next.mobileToolbar);
        toolbar.root.dataset.position = next.toolbar.position;
        closePopover?.(false);
        if (next.toolbar.position === 'bottom') host.appendChild(toolbar.root);
        else host.insertBefore(toolbar.root, host.firstChild);
        toolbar.updateOverflow();
        editor.requestMeasure();
    };
    placeToolbar(settings);
    if (toolbar.status) {
        const strip = document.createElement('div');
        strip.className = 'cmp--statusbar';
        strip.appendChild(toolbar.status);
        host.appendChild(strip);
    }

    // Open fullscreen if: remembered state is on, or mobile auto-fullscreen is set.
    // Use the toolbar's setter so the class and button stay in sync;
    // notify:false so restoring doesn't re-write the same setting.
    if (dialog) {
        const wantFs = (settings.rememberFullscreen && settings.fullscreenState)
            || (isMobileDevice() && settings.fullscreenOnMobile);
        if (wantFs) toolbar.setFullscreen?.(true, { notify: false });
    }

    toolbar.syncSearchState();

    let applied = settings;
    let appliedProfileChoice = profileChoice;
    const applyLiveSettings = (raw) => {
        const next = resolveProfile(raw, purpose, profileChoice);
        const profileChanged = next.fieldProfiles !== applied.fieldProfiles || profileChoice !== appliedProfileChoice;
        const effects = [];
        const change = (key, compartment, extension) => {
            if (next[key] !== applied[key]) effects.push(compartment.reconfigure(extension()));
        };
        change('theme', themeComp, () => getTheme(next.theme).extension);
        change('lineWrap', wrapComp, () => next.lineWrap ? EditorView.lineWrapping : []);
        change('lineNumbers', linesComp, () => next.lineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []);
        change('highlightActiveLine', activeLineComp, () => next.highlightActiveLine ? highlightActiveLine() : []);
        change('bracketMatching', bracketComp, () => next.bracketMatching ? bracketMatching() : []);
        change('closeBrackets', closeBrComp, () => next.closeBrackets ? closeBrackets() : []);
        change('indentSize', indentComp, () => indentExt(next.indentSize));
        change('codeFolding', foldComp, () => foldExt(next.codeFolding));
        change('autocomplete', autocompleteComp, () => autocompleteExt(next.autocomplete));
        if (next.fontSize !== applied.fontSize || next.lineHeight !== applied.lineHeight) {
            effects.push(fontComp.reconfigure(fontTheme(next.fontSize, next.lineHeight)));
        }
        applied = next;
        appliedProfileChoice = profileChoice;
        if (effects.length) editor.dispatch({ effects });
        if (toolbar.root.dataset.position !== next.toolbar.position
            || toolbar.root.hidden !== (!next.toolbar.show || (isMobileDevice() && !next.mobileToolbar))) placeToolbar(next);
        toolbar.updateProfile();
        if (!languageChosen && profileChanged) {
            const id = profileLanguage(raw, purpose, profileChoice, detectLanguage(target, raw));
            if (id !== desiredLanguage) setLanguage(id);
        }
    };
    scope.defer(onSettingsChange(applyLiveSettings));
    scope.defer(watchHostTheme(() => {
        if (applied.theme === 'auto') editor.dispatch({ effects: themeComp.reconfigure(getTheme('auto').extension) });
    }));
    scope.defer(onLocaleChange(() => {
        editor.contentDOM.setAttribute('aria-label', t('cmp.a11y.editor'));
    }));

    // Remeasure on later size changes (fullscreen, mobile keyboard). rAF-coalesced
    // so bursts cost one measure/frame; disconnected on teardown.
    let resizeObs = null;
    if (typeof ResizeObserver === 'function') {
        let pending = false;
        resizeObs = new ResizeObserver(() => {
            if (pending) return;
            pending = true;
            scope.frame(() => { pending = false; editor.requestMeasure(); });
        });
        resizeObs.observe(host);
        scope.defer(() => resizeObs.disconnect());
    }

    scope.defer(() => foldCancel?.());
    if (dialog && globalThis.visualViewport) {
        const measureViewport = () => {
            dialog.style.setProperty('--cmp-viewport-height', `${visualViewport.height}px`);
            dialog.style.setProperty('--cmp-viewport-width', `${visualViewport.width}px`);
            dialog.style.setProperty('--cmp-viewport-top', `${visualViewport.offsetTop}px`);
            dialog.style.setProperty('--cmp-viewport-left', `${visualViewport.offsetLeft}px`);
            editor.requestMeasure();
        };
        scope.listen(visualViewport, 'resize', measureViewport);
        scope.listen(visualViewport, 'scroll', measureViewport);
        measureViewport();
        scope.defer(() => {
            for (const key of ['height', 'width', 'top', 'left']) dialog.style.removeProperty(`--cmp-viewport-${key}`);
        });
    }
    scope.listen(target, 'input', () => {
        if (syncing || target.value === editor.state.doc.toString()) return;
        syncing = true;
        try {
            editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: target.value } });
        } finally { syncing = false; }
    });

    if (dialog) {
        scope.listen(dialog, 'close', cleanup);
    }

    return { editor, host, toolbar, cleanup };
    } catch (error) {
        cleanup();
        fail('setup', error);
        return null;
    }
}

function openQuickSettings(host, anchor) {
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
    ownTranslations(pop);

    const themeSel = pop.querySelector('[data-qs="theme"]');
    // Localize both the "Follow SillyTavern" option and all data-i18n spans
    const refreshLabels = () => {
        translateElements(pop);
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
        saveSettings({ [key]: v });
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
        saveSettings({ [key]: v });
    });

    // Keep popover in sync if the main ST drawer changes these same settings
    const offSync = onSettingsChange((s) => syncFromSettings(s));
    const offLocale = onLocaleChange(refreshLabels);

    // Swallow clicks so the outside-click handler doesn't close us
    pop.addEventListener('click', e => e.stopPropagation());

    host.appendChild(pop);

    return bindPopover(pop, anchor, [offSync, offLocale]);
}

function openLangPicker(host, anchor, current, onPick) {
    const menu = document.createElement('div');
    menu.className = 'cmp--lang-menu';
    menu.setAttribute('role', 'menu');
    let close;
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
    host.appendChild(menu);

    close = bindPopover(menu, anchor);
    return close;
}

function openFormatPicker(host, anchor, editor) {
    const menu = document.createElement('div');
    menu.className = 'cmp--lang-menu';
    menu.setAttribute('role', 'menu');
    let close;
    for (const format of FORMATS) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'cmp--lang-item';
        item.setAttribute('role', 'menuitem');
        item.textContent = t(`cmp.format.${format.id}`);
        item.addEventListener('click', () => { close(false); formatSelection(editor, format.marker); });
        menu.appendChild(item);
    }
    host.appendChild(menu);
    close = bindPopover(menu, anchor);
    return close;
}

function openProfilePicker(host, anchor, current, onPick) {
    const menu = document.createElement('div');
    menu.className = 'cmp--lang-menu';
    menu.setAttribute('role', 'menu');
    let close;
    for (const id of ['auto', 'none', 'prose', 'code']) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'cmp--lang-item';
        item.setAttribute('role', 'menuitemradio');
        item.setAttribute('aria-checked', String(id === current));
        if (id === current) item.setAttribute('aria-current', 'true');
        item.textContent = t(`cmp.profile.${id}`);
        item.addEventListener('click', () => { close(); onPick(id); });
        menu.appendChild(item);
    }
    host.appendChild(menu);
    close = bindPopover(menu, anchor);
    return close;
}
