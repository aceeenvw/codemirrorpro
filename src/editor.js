import { EditorView, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { indentOnInput, bracketMatching } from '@codemirror/language';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { cmpSearch } from './search-panel.js';

import { buildPayload, stableId } from './build-info.js';
import { getSettings, onSettingsChange, saveSettings } from './settings.js';
import { detectLanguage, loadLanguageExtension } from './languages.js';
import { getTheme } from './themes.js';
import { buildToolbar, isMobileDevice } from './toolbar.js';
import { t, onLocaleChange } from './i18n.js';

const ATTACHED = new WeakSet();

/**
 * Fixes upstream bugs:
 *  #1 safe context read, #2 explicit teardown, #4 re-attach guard,
 *  #5 sync loop guard, #6 parent null-check, #7 unified toolbar,
 *  #8 full language detection, #9 configurable wrap, #10 rAF focus,
 *  #11 editor.destroy() on close, #14 :has fallback class,
 *  #16 tab/esc accessibility, #17 aria-label.
 */
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

    // Compartments → live reconfigure without editor rebuild.
    const langComp = new Compartment();
    const themeComp = new Compartment();
    const wrapComp = new Compartment();
    const linesComp = new Compartment();
    const activeLineComp = new Compartment();
    const bracketComp = new Compartment();
    const closeBrComp = new Compartment();
    const fontComp = new Compartment();

    const fontTheme = (px) => EditorView.theme({
        '.cm-content': { fontSize: `${px}px`, fontFamily: 'var(--monoFontFamily)' },
        '.cm-gutters': { fontSize: `${px}px`, fontFamily: 'var(--monoFontFamily)' },
    });

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
                indentWithTab,
            ]),
            linesComp.of(settings.lineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
            activeLineComp.of(settings.highlightActiveLine ? highlightActiveLine() : []),
            bracketComp.of(settings.bracketMatching ? bracketMatching() : []),
            closeBrComp.of(settings.closeBrackets ? closeBrackets() : []),
            wrapComp.of(settings.lineWrap ? EditorView.lineWrapping : []),
            themeComp.of(getTheme(settings.theme).extension),
            fontComp.of(fontTheme(settings.fontSize || 14)),
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
            }),
        ],
        parent: host,
    });

    // Language pack: async load, reconfigure when ready.
    let currentLang = initialLang;
    loadLanguageExtension(initialLang).then(ext => {
        if (ext) editor.dispatch({ effects: langComp.reconfigure(ext) });
    }).catch(() => {});

    // rAF: focus + cursor-to-end after first paint. Firefox mobile invisible-cursor fix.
    requestAnimationFrame(() => {
        editor.dispatch({
            selection: { anchor: editor.state.doc.length, head: editor.state.doc.length },
        });
        editor.focus();
    });

    const toolbar = buildToolbar({
        editor,
        dialog: dialog || host,
        settings,
        getLanguage: () => currentLang,
        onSettingsClick: () => openQuickSettings(editor, host, dialog, applyLiveSettings),
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
    // Status strip pinned to bottom on every viewport.
    if (toolbar.status) {
        const strip = document.createElement('div');
        strip.className = 'cmp--statusbar';
        strip.appendChild(toolbar.status);
        host.appendChild(strip);
    }

    // Auto-fullscreen: mobile + opt-in setting.
    if (isMobileDevice() && settings.fullscreenOnMobile && dialog) {
        dialog.classList.add('cmp--fullscreen');
    }

    // Live reconfigure from settings changes.
    const applyLiveSettings = (next) => {
        editor.dispatch({
            effects: [
                themeComp.reconfigure(getTheme(next.theme).extension),
                wrapComp.reconfigure(next.lineWrap ? EditorView.lineWrapping : []),
                linesComp.reconfigure(next.lineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []),
                activeLineComp.reconfigure(next.highlightActiveLine ? highlightActiveLine() : []),
                bracketComp.reconfigure(next.bracketMatching ? bracketMatching() : []),
                closeBrComp.reconfigure(next.closeBrackets ? closeBrackets() : []),
                fontComp.reconfigure(fontTheme(next.fontSize || 14)),
            ],
        });
    };
    const offSettings = onSettingsChange(applyLiveSettings);
    const offLocale = onLocaleChange(() => {
        host.setAttribute('aria-label', t('cmp.a11y.editor'));
    });

    // Teardown: fires on <dialog> close or detach from DOM.
    const cleanup = () => {
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

    const s = getSettings();
    const fsz = Math.max(10, Math.min(28, Number(s.fontSize) || 14));
    const pop = document.createElement('div');
    pop.className = 'cmp--quick-settings';
    // Static markup only — no user-supplied values interpolated.
    pop.innerHTML = `
        <label class="cmp--row cmp--check"><input type="checkbox" data-qs="lineNumbers" /><span data-i18n="cmp.settings.line_numbers"></span></label>
        <label class="cmp--row cmp--check"><input type="checkbox" data-qs="lineWrap" /><span data-i18n="cmp.settings.line_wrap"></span></label>
        <label class="cmp--row"><span data-i18n="cmp.settings.font_size"></span><input type="number" min="10" max="28" step="1" data-qs="fontSize" /></label>
        <label class="cmp--row"><span data-i18n="cmp.settings.theme"></span>
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
    pop.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.getAttribute('data-i18n')));
    pop.querySelector('[data-qs="lineNumbers"]').checked = !!s.lineNumbers;
    pop.querySelector('[data-qs="lineWrap"]').checked = !!s.lineWrap;
    pop.querySelector('[data-qs="fontSize"]').value = String(fsz);
    const themeSel = pop.querySelector('[data-qs="theme"]');
    themeSel.options[0].textContent = t('cmp.settings.theme_auto');
    themeSel.value = ['auto', 'one-dark', 'solarized-light', 'solarized-dark', 'github-light', 'github-dark', 'dracula'].includes(s.theme) ? s.theme : 'auto';
    pop.addEventListener('change', (ev) => {
        const el = ev.target;
        const key = el.getAttribute('data-qs');
        if (!key) return;
        let v = el.type === 'checkbox' ? el.checked : (el.type === 'number' ? Number(el.value) : el.value);
        const next = saveSettings({ [key]: v });
        applyFn(next);
    });
    pop.addEventListener('click', e => e.stopPropagation());
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', t('cmp.toolbar.settings'));
    host.appendChild(pop);
    const off = (e) => {
        if (!pop.contains(e.target)) close();
    };
    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    const close = () => {
        pop.remove();
        document.removeEventListener('mousedown', off, true);
        document.removeEventListener('keydown', onEsc, true);
    };
    setTimeout(() => {
        document.addEventListener('mousedown', off, true);
        document.addEventListener('keydown', onEsc, true);
    }, 0);
}

function openLangPicker(anchor, current, onPick) {
    const ids = ['plain', 'css', 'markdown', 'html', 'json', 'javascript'];
    const menu = document.createElement('div');
    menu.className = 'cmp--lang-menu';
    menu.setAttribute('role', 'menu');
    ids.forEach(id => {
        const item = document.createElement('button');
        item.type = 'button';
        item.setAttribute('role', 'menuitem');
        item.className = 'cmp--lang-item' + (id === current ? ' cmp--active' : '');
        item.textContent = id === 'plain' ? t('cmp.settings.language_plain') : id.toUpperCase();
        if (id === current) item.setAttribute('aria-current', 'true');
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menu.remove();
            onPick(id);
        });
        menu.appendChild(item);
    });
    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const vw = innerWidth;
    const vh = innerHeight;
    let top = rect.bottom + 6;
    let left = rect.left;
    if (left + m.width > vw - 8) left = Math.max(8, vw - m.width - 8);
    if (top + m.height > vh - 8) top = Math.max(8, rect.top - m.height - 6);
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    const off = (e) => {
        if (!menu.contains(e.target) && e.target !== anchor) {
            menu.remove();
            document.removeEventListener('mousedown', off, true);
            document.removeEventListener('keydown', onEsc, true);
        }
    };
    const onEsc = (e) => {
        if (e.key === 'Escape') {
            menu.remove();
            document.removeEventListener('mousedown', off, true);
            document.removeEventListener('keydown', onEsc, true);
        }
    };
    setTimeout(() => {
        document.addEventListener('mousedown', off, true);
        document.addEventListener('keydown', onEsc, true);
    }, 0);
}
