import { openSearchPanel, findNext, findPrevious } from '@codemirror/search';
import { undo, redo } from '@codemirror/commands';
import { t, onLocaleChange, formatNumber } from './i18n.js';

function toast(type, key, params) {
    const msg = t(key, params);
    try { globalThis.toastr?.[type]?.(msg); }
    catch { console.log('[cmp]', msg); }
}

function isMobileDevice() {
    try {
        const ctx = globalThis.SillyTavern?.getContext?.();
        const im = ctx?.isMobile;
        if (typeof im === 'function') return !!im();
        if (typeof im === 'boolean') return im;
    } catch { /* ignore */ }
    return (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)
        || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');
}

function mkBtn(iconClass, labelKey, handler, extraClass = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `cmp--btn ${extraClass}`.trim();
    b.innerHTML = `<i class="${iconClass}"></i><span class="cmp--btn-label" data-i18n="${labelKey}"></span>`;
    b.setAttribute('data-i18n-title', labelKey);
    b.setAttribute('aria-label', t(labelKey));
    b.title = t(labelKey);
    b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
    });
    return b;
}

async function pasteIntoEditor(editor) {
    try {
        const text = await navigator.clipboard.readText();
        if (!text) { toast('info', 'cmp.toast.paste_empty'); return; }
        const sel = editor.state.selection.main;
        editor.dispatch({
            changes: { from: sel.from, to: sel.to, insert: text },
            selection: { anchor: sel.from + text.length },
            scrollIntoView: true,
        });
        editor.focus();
        toast('success', 'cmp.toast.pasted');
    } catch {
        toast('error', 'cmp.toast.paste_denied');
    }
}

async function copyAll(editor) {
    try {
        await navigator.clipboard.writeText(editor.state.doc.toString());
        toast('success', 'cmp.toast.copied');
    } catch {
        toast('error', 'cmp.toast.copy_failed');
    }
}

function toggleFullscreen(dialog) {
    dialog.classList.toggle('cmp--fullscreen');
}

/**
 * Build toolbar. Returns { root, destroy, updateStatus }.
 */
export function buildToolbar({ editor, dialog, settings, onSettingsClick, onLanguageClick, getLanguage }) {
    const root = document.createElement('div');
    root.className = 'cmp--toolbar';
    root.dataset.position = settings.toolbar?.position || 'top';
    if (isMobileDevice()) root.classList.add('cmp--mobile');

    const langChip = document.createElement('button');
    langChip.type = 'button';
    langChip.className = 'cmp--lang-chip';
    langChip.setAttribute('aria-label', t('cmp.toolbar.language'));
    langChip.title = t('cmp.toolbar.language');
    langChip.innerHTML = `<i class="fa-solid fa-code"></i><span class="cmp--lang-chip-text"></span>`;
    langChip.addEventListener('click', (e) => { e.preventDefault(); onLanguageClick?.(langChip); });

    const btnGroup = document.createElement('div');
    btnGroup.className = 'cmp--btn-group';

    const bSearch = mkBtn('fa-solid fa-magnifying-glass', 'cmp.toolbar.search', () => {
        editor.focus();
        openSearchPanel(editor);
    });
    const bReplace = mkBtn('fa-solid fa-right-left', 'cmp.toolbar.replace', () => {
        editor.focus();
        openSearchPanel(editor);
        setTimeout(() => {
            const panel = dialog.querySelector('.cm-panel.cm-search');
            const replaceInput = panel?.querySelector('input[name="replace"]');
            replaceInput?.focus();
        }, 40);
    });
    const bPaste = mkBtn('fa-solid fa-paste', 'cmp.toolbar.paste', () => pasteIntoEditor(editor));
    const bCopy = mkBtn('fa-solid fa-copy', 'cmp.toolbar.copy', () => copyAll(editor));
    const bUndo = mkBtn('fa-solid fa-rotate-left', 'cmp.toolbar.undo', () => { undo(editor); editor.focus(); });
    const bRedo = mkBtn('fa-solid fa-rotate-right', 'cmp.toolbar.redo', () => { redo(editor); editor.focus(); });
    const bFull = mkBtn('fa-solid fa-expand', 'cmp.toolbar.fullscreen', () => {
        toggleFullscreen(dialog);
        const exp = dialog.classList.contains('cmp--fullscreen');
        bFull.querySelector('i').className = exp ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
        bFull.setAttribute('data-i18n-title', exp ? 'cmp.toolbar.fullscreen_exit' : 'cmp.toolbar.fullscreen');
        bFull.title = t(exp ? 'cmp.toolbar.fullscreen_exit' : 'cmp.toolbar.fullscreen');
    });
    const bSettings = mkBtn('fa-solid fa-gear', 'cmp.toolbar.settings', () => onSettingsClick?.(bSettings));

    [bSearch, bReplace, bPaste, bCopy, bUndo, bRedo, bFull, bSettings].forEach(b => btnGroup.appendChild(b));

    const status = document.createElement('div');
    status.className = 'cmp--status';

    root.appendChild(langChip);
    root.appendChild(btnGroup);
    root.appendChild(status);

    function updateLangChip() {
        const id = getLanguage?.() || 'plain';
        const label = id === 'plain' ? t('cmp.settings.language_plain') : id.toUpperCase();
        langChip.querySelector('.cmp--lang-chip-text').textContent = label;
    }

    function updateStatus() {
        const sel = editor.state.selection.main;
        const line = editor.state.doc.lineAt(sel.head);
        const col = sel.head - line.from + 1;
        const chars = editor.state.doc.length;
        const text = `${t('cmp.status.position', { line: line.number, col })} · ${t('cmp.status.chars', { count: formatNumber(chars) })}`;
        status.textContent = text;
    }

    function rerenderLabels() {
        root.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        root.querySelectorAll('[data-i18n-title]').forEach(el => {
            const k = el.getAttribute('data-i18n-title');
            el.title = t(k);
            el.setAttribute('aria-label', t(k));
        });
        updateLangChip();
        updateStatus();
    }
    rerenderLabels();

    const offLocale = onLocaleChange(rerenderLabels);

    function destroy() {
        offLocale?.();
        root.remove();
    }

    return { root, destroy, updateStatus, updateLangChip, rerenderLabels };
}

export { isMobileDevice };
