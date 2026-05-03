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
    b.setAttribute('formnovalidate', '');
    b.setAttribute('formmethod', 'get');
    const icon = document.createElement('i');
    icon.className = String(iconClass);
    const label = document.createElement('span');
    label.className = 'cmp--btn-label';
    label.setAttribute('data-i18n', String(labelKey));
    label.textContent = t(labelKey);
    b.append(icon, label);
    b.setAttribute('data-i18n-title', String(labelKey));
    b.setAttribute('aria-label', t(labelKey));
    b.title = t(labelKey);
    // Stop every pointer/mouse phase before ST's popup delegate runs.
    ['pointerdown', 'mousedown', 'click', 'touchstart'].forEach(ev => {
        b.addEventListener(ev, (e) => {
            e.stopPropagation();
            if (ev === 'click') {
                e.preventDefault();
                handler(e);
            }
        });
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

// Snapshot + restore: ST sets inline width/top/left on dialog.popup; we
// must outrank those with !important inline writes, then put them back.
const SAVED_INLINE = new WeakMap();
const FS_PROPS = [
    ['width', '100dvw'], ['height', '100dvh'],
    ['max-width', '100dvw'], ['max-height', '100dvh'],
    ['min-width', '100dvw'], ['min-height', '100dvh'],
    ['top', '0'], ['left', '0'], ['right', '0'], ['bottom', '0'],
    ['margin', '0'], ['transform', 'none'], ['inset', '0'],
];

function applyFullscreenInline(dialog) {
    if (!SAVED_INLINE.has(dialog)) {
        SAVED_INLINE.set(dialog, dialog.getAttribute('style') || '');
    }
    for (const [k, v] of FS_PROPS) dialog.style.setProperty(k, v, 'important');
}

function restoreInline(dialog) {
    const saved = SAVED_INLINE.get(dialog);
    if (saved == null) return;
    if (saved) dialog.setAttribute('style', saved);
    else dialog.removeAttribute('style');
    SAVED_INLINE.delete(dialog);
}

function toggleFullscreen(dialog) {
    // Shield window: ST's popup listens for class/style mutations and may
    // call dialog.close() in response. Intercept both the close() method
    // and cancel/close events for ~180ms around the toggle.
    const origClose = dialog.close;
    let closeBlocked = false;
    dialog.close = function (...args) {
        closeBlocked = true;
        if (globalThis.CMP_DEBUG) console.warn('[cmp:fs] blocked dialog.close() during toggle', args);
    };
    const cancelGuard = (ev) => {
        ev.preventDefault();
        ev.stopImmediatePropagation();
    };
    dialog.addEventListener('cancel', cancelGuard, { capture: true });
    setTimeout(() => {
        dialog.close = origClose;
        dialog.removeEventListener('cancel', cancelGuard, { capture: true });
        if (closeBlocked && globalThis.CMP_DEBUG) console.warn('[cmp:fs] shield window ended; close was blocked at least once');
    }, 200);

    const on = !dialog.classList.contains('cmp--fullscreen');
    dialog.classList.toggle('cmp--fullscreen', on);
    on ? applyFullscreenInline(dialog) : restoreInline(dialog);
    return on;
}

/**
 * Build toolbar. Returns { root, destroy, updateStatus }.
 */
export function buildToolbar({ editor, dialog, settings, onSettingsClick, onLanguageClick, getLanguage }) {
    const root = document.createElement('div');
    root.className = 'cmp--toolbar';
    root.dataset.position = settings.toolbar?.position || 'top';
    if (isMobileDevice()) root.classList.add('cmp--mobile');

    // Capture-phase firewall on the toolbar: stop every bubbling pointer
    // event from reaching ST's dialog-level delegates.
    ['pointerdown', 'mousedown', 'click', 'touchstart', 'touchend'].forEach(ev => {
        root.addEventListener(ev, (e) => {
            e.stopPropagation();
        }, true);
    });

    const langChip = document.createElement('button');
    langChip.type = 'button';
    langChip.className = 'cmp--lang-chip';
    langChip.setAttribute('aria-label', t('cmp.toolbar.language'));
    langChip.title = t('cmp.toolbar.language');
    const lcIcon = document.createElement('i');
    lcIcon.className = 'fa-solid fa-code';
    const lcText = document.createElement('span');
    lcText.className = 'cmp--lang-chip-text';
    langChip.append(lcIcon, lcText);
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
    let fsGuard = null;
    const DBG = () => globalThis.CMP_DEBUG === true;
    const log = (...a) => DBG() && console.log('[cmp:fs]', ...a);

    const bFull = mkBtn('fa-solid fa-expand', 'cmp.toolbar.fullscreen', (e) => {
        log('click fired; target =', e?.target, '; currentTarget =', e?.currentTarget);
        log('dialog.open =', dialog.open, '; dialog.isConnected =', dialog.isConnected);

        if (DBG()) {
            const onClose = () => console.log('[cmp:fs] DIALOG CLOSED after button click');
            const onCancel = () => console.log('[cmp:fs] DIALOG CANCEL event');
            dialog.addEventListener('close', onClose, { once: true });
            dialog.addEventListener('cancel', onCancel, { once: true });
            setTimeout(() => {
                dialog.removeEventListener('close', onClose);
                dialog.removeEventListener('cancel', onCancel);
            }, 500);
        }

        const on = toggleFullscreen(dialog);
        log('toggled =>', on, '; dialog.classList =', dialog.className);

        bFull.querySelector('i').className = on ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
        bFull.setAttribute('data-i18n-title', on ? 'cmp.toolbar.fullscreen_exit' : 'cmp.toolbar.fullscreen');
        bFull.title = t(on ? 'cmp.toolbar.fullscreen_exit' : 'cmp.toolbar.fullscreen');
        fsGuard?.disconnect();
        fsGuard = null;
        if (on) {
            fsGuard = new MutationObserver((muts) => {
                log('dialog mutation:', muts.map(m => m.attributeName));
                if (!dialog.classList.contains('cmp--fullscreen')) return;
                if (dialog.style.width !== '100dvw') applyFullscreenInline(dialog);
            });
            fsGuard.observe(dialog, { attributes: true, attributeFilter: ['style', 'class'] });
        }
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
        fsGuard?.disconnect();
        fsGuard = null;
        if (dialog?.classList?.contains('cmp--fullscreen')) {
            dialog.classList.remove('cmp--fullscreen');
            restoreInline(dialog);
        }
        root.remove();
    }

    return { root, destroy, updateStatus, updateLangChip, rerenderLabels };
}

export { isMobileDevice };
