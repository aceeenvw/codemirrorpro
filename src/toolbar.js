import { openSearchPanel, closeSearchPanel, searchPanelOpen } from '@codemirror/search';
import { undo, redo, selectAll, isolateHistory } from '@codemirror/commands';
import { t, onLocaleChange, formatNumber, translateElements } from './i18n.js';
import { createScope } from './lifecycle.js';
import { createTokenCounter } from './token-count.js';
import { warn } from './log.js';

function toast(type, key, params) {
    const msg = t(key, params);
    try { globalThis.toastr?.[type]?.(msg); }
    catch (error) { warn('toast', error); }
}

function isMobileDevice() {
    try {
        const ctx = globalThis.SillyTavern?.getContext?.();
        const im = ctx?.isMobile;
        if (typeof im === 'function' && im()) return true;
        if (im === true) return true;
    } catch { /* ignore */ }
    return (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)
        || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');
}

function mkBtn(iconClass, labelKey, handler, extraClass = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `cmp--btn ${extraClass}`.trim();
    b.setAttribute('formnovalidate', '');
    const icon = document.createElement('i');
    icon.className = String(iconClass);
    const label = document.createElement('span');
    label.className = 'cmp--btn-label';
    label.setAttribute('data-cmp-i18n', String(labelKey));
    label.textContent = t(labelKey);
    b.append(icon, label);
    b.setAttribute('data-cmp-i18n-title', String(labelKey));
    b.setAttribute('aria-label', t(labelKey));
    b.title = t(labelKey);
    b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
    });
    return b;
}

async function pasteIntoEditor(editor, scope) {
    const doc = editor.state.doc;
    const sel = editor.state.selection.main;
    try {
        const text = await navigator.clipboard.readText();
        if (!scope.alive || editor.state.doc !== doc) return;
        if (!text) { toast('info', 'cmp.toast.paste_empty'); return; }
        editor.dispatch({
            changes: { from: sel.from, to: sel.to, insert: text },
            selection: { anchor: sel.from + text.length },
            scrollIntoView: true,
            annotations: isolateHistory.of('full'),
        });
        editor.focus();
        toast('success', 'cmp.toast.pasted');
    } catch {
        if (scope.alive) toast('error', 'cmp.toast.paste_denied');
    }
}

async function copyAll(editor, scope) {
    try {
        await navigator.clipboard.writeText(editor.state.doc.toString());
        if (scope.alive) toast('success', 'cmp.toast.copied');
    } catch {
        if (scope.alive) toast('error', 'cmp.toast.copy_failed');
    }
}

// Empty the doc in one undoable transaction (no confirm; Ctrl+Z restores).
function clearAll(editor) {
    const len = editor.state.doc.length;
    if (!len) { toast('info', 'cmp.toast.already_empty'); return; }
    editor.dispatch({
        changes: { from: 0, to: len, insert: '' },
        selection: { anchor: 0 },
        scrollIntoView: true,
        annotations: isolateHistory.of('full'),
    });
    editor.focus();
    toast('success', 'cmp.toast.cleared');
}

// Returns { root, status, destroy, updateStatus, updateLangChip,
// rerenderLabels, syncSearchState }.
export function buildToolbar({ editor, dialog, settings, onSettingsClick, onLanguageClick, onFullscreenChange, getLanguage, markdownEnabled, onFormatClick, getProfile, onProfileClick }) {
    const scope = createScope();
    const root = document.createElement('div');
    root.className = 'cmp--toolbar';
    root.dataset.position = settings.toolbar?.position || 'top';
    if (isMobileDevice()) root.classList.add('cmp--mobile');

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

    // Groups: history · search · clipboard · view (assembled with separators).
    const bUndo = mkBtn('fa-solid fa-rotate-left', 'cmp.toolbar.undo', () => { undo(editor); editor.focus(); });
    const bRedo = mkBtn('fa-solid fa-rotate-right', 'cmp.toolbar.redo', () => { redo(editor); editor.focus(); });
    const bSearch = mkBtn('fa-solid fa-magnifying-glass', 'cmp.toolbar.search', () => {
        if (searchPanelOpen(editor.state)) {
            closeSearchPanel(editor);
            editor.focus();
        } else {
            editor.focus();
            openSearchPanel(editor);
        }
    });
    const bSelectAll = mkBtn('fa-solid fa-object-group', 'cmp.toolbar.select_all', () => { selectAll(editor); editor.focus(); });
    const bPaste = mkBtn('fa-solid fa-paste', 'cmp.toolbar.paste', () => pasteIntoEditor(editor, scope));
    const bCopy = mkBtn('fa-solid fa-copy', 'cmp.toolbar.copy', () => copyAll(editor, scope));
    const bClear = mkBtn('fa-solid fa-eraser', 'cmp.toolbar.clear', () => clearAll(editor), 'cmp--btn-danger');

    const setFullscreen = (on, { notify = true } = {}) => {
        const isOn = dialog.classList.contains('cmp--fullscreen');
        if (on === isOn) { applyFsButton(on); return on; }
        dialog.classList.toggle('cmp--fullscreen', on);
        applyFsButton(on);
        editor.requestMeasure();
        if (notify) onFullscreenChange?.(on);
        return on;
    };
    const bFull = mkBtn('fa-solid fa-expand', 'cmp.toolbar.fullscreen', () => {
        setFullscreen(!dialog.classList.contains('cmp--fullscreen'));
    });
    function applyFsButton(on) {
        bFull.querySelector('i').className = on ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
        bFull.setAttribute('aria-pressed', String(on));
        bFull.classList.toggle('cmp--btn-active', on);
        bFull.setAttribute('data-cmp-i18n-title', on ? 'cmp.toolbar.fullscreen_exit' : 'cmp.toolbar.fullscreen');
        bFull.title = t(on ? 'cmp.toolbar.fullscreen_exit' : 'cmp.toolbar.fullscreen');
        bFull.setAttribute('aria-label', bFull.title);
    }
    const bSettings = mkBtn('fa-solid fa-gear', 'cmp.toolbar.settings', () => onSettingsClick?.(bSettings), 'cmp--btn-accent');
    const bFormat = mkBtn('fa-solid fa-bold', 'cmp.toolbar.format', () => onFormatClick?.(bFormat));
    const bProfile = mkBtn('fa-solid fa-sliders', 'cmp.toolbar.profile', () => onProfileClick?.(bProfile));
    const bTokens = mkBtn('fa-solid fa-hashtag', 'cmp.toolbar.tokens', () => tokenCounter.run());
    const tokenValue = document.createElement('span');
    tokenValue.className = 'cmp--token-value';
    bTokens.appendChild(tokenValue);
    const announcement = document.createElement('span');
    announcement.className = 'cmp--sr-only';
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    root.appendChild(announcement);
    let tokenState;
    const renderToken = () => {
        if (!tokenState) return;
        const message = t(`cmp.tokens.${tokenState.status}`, { count: formatNumber(tokenState.count || 0) });
        tokenValue.textContent = message;
        bTokens.title = message;
        bTokens.setAttribute('aria-label', `${t('cmp.toolbar.tokens')}: ${message}`);
        bTokens.disabled = tokenState.busy;
        bTokens.setAttribute('aria-busy', String(tokenState.busy));
        announcement.textContent = message;
    };
    const tokenCounter = createTokenCounter({ getDoc: () => editor.state.doc,
        getCounter: () => globalThis.SillyTavern?.getContext?.()?.getTokenCountAsync,
        onState: state => { tokenState = state; renderToken(); } });
    scope.defer(tokenCounter.destroy);

    const groups = [
        [bUndo, bRedo],
        [bSearch],
        [bFormat, bTokens],
        [bSelectAll, bPaste, bCopy, bClear],
        [bProfile, bFull, bSettings],
    ];
    groups.forEach((group, idx) => {
        if (idx > 0) {
            const sep = document.createElement('span');
            sep.className = 'cmp--sep';
            sep.setAttribute('aria-hidden', 'true');
            btnGroup.appendChild(sep);
        }
        group.forEach(b => btnGroup.appendChild(b));
    });

    // Status element lives here but mounts into editor.js bottom strip.
    const status = document.createElement('div');
    status.className = 'cmp--status';

    // ── Overflow scroll arrows ────────────────────────────────────
    // Content scrolls in its own track; arrows are absolute overlays outside the
    // scroll flow, so they stay put and never cause flex/sticky jank. CSS reacts
    // to the data-overflow-* attrs (opacity only → no reflow).
    const track = document.createElement('div');
    track.className = 'cmp--toolbar-track';

    const reduceMotion = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;

    const mkArrow = (dir, iconClass, labelKey) => {
        const a = document.createElement('button');
        a.type = 'button';
        a.className = `cmp--scroll-arrow cmp--scroll-${dir}`;
        a.setAttribute('formnovalidate', '');
        a.setAttribute('data-cmp-i18n-title', labelKey);
        a.title = t(labelKey);
        a.setAttribute('aria-label', t(labelKey));
        const i = document.createElement('i');
        i.className = iconClass;
        a.appendChild(i);
        a.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const amount = Math.max(80, Math.round(track.clientWidth * 0.7));
            track.scrollBy({
                left: dir === 'left' ? -amount : amount,
                behavior: reduceMotion ? 'auto' : 'smooth',
            });
        });
        return a;
    };
    const arrowLeft = mkArrow('left', 'fa-solid fa-chevron-left', 'cmp.toolbar.scroll_left');
    const arrowRight = mkArrow('right', 'fa-solid fa-chevron-right', 'cmp.toolbar.scroll_right');

    // Cache geometry (refreshed on resize only) so the scroll path reads just
    // scrollLeft and writes attrs only on change → no layout thrash.
    let maxScroll = 0;
    let lastL = null;
    let lastR = null;
    let scrollPending = false;
    const applyOverflow = () => {
        const x = track.scrollLeft;
        const l = x > 1;
        const r = x < maxScroll - 1;
        if (l !== lastL) { lastL = l; root.toggleAttribute('data-overflow-left', l); }
        if (r !== lastR) { lastR = r; root.toggleAttribute('data-overflow-right', r); }
        arrowLeft.disabled = !l;
        arrowRight.disabled = !r;
        arrowLeft.tabIndex = l ? 0 : -1;
        arrowRight.tabIndex = r ? 0 : -1;
    };
    const onScroll = () => {
        if (scrollPending) return;
        scrollPending = true;
        scope.frame(() => { scrollPending = false; applyOverflow(); });
    };
    // Refresh cached geometry, then re-evaluate. For resize/mount.
    const updateOverflow = () => {
        maxScroll = track.scrollWidth - track.clientWidth;
        applyOverflow();
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    let arrowResizeObs = null;
    if (typeof ResizeObserver === 'function') {
        let pending = false;
        arrowResizeObs = new ResizeObserver(() => {
            if (pending) return;
            pending = true;
            scope.frame(() => { pending = false; updateOverflow(); });
        });
        arrowResizeObs.observe(track);
        arrowResizeObs.observe(btnGroup);
        arrowResizeObs.observe(langChip);
    }

    track.appendChild(langChip);
    track.appendChild(btnGroup);
    root.appendChild(track);
    root.appendChild(arrowLeft);
    root.appendChild(arrowRight);

    function updateLangChip() {
        bFormat.hidden = !markdownEnabled?.();
        const id = getLanguage?.() || 'plain';
        const label = id === 'plain' ? t('cmp.settings.language_plain') : id.toUpperCase();
        langChip.querySelector('.cmp--lang-chip-text').textContent = label;
        scope.frame(updateOverflow);
    }

    let countedDoc;
    let words = 0;
    function updateStatus() {
        if (isMobileDevice()) { status.textContent = ''; return; }
        const sel = editor.state.selection.main;
        const line = editor.state.doc.lineAt(sel.head);
        const col = sel.head - line.from + 1;
        const chars = editor.state.doc.length;
        if (countedDoc !== editor.state.doc) {
            countedDoc = editor.state.doc;
            words = null;
            if (chars <= 250000) {
                const text = countedDoc.toString();
                words = 0;
                const cursor = /\S+/g;
                while (cursor.exec(text)) words++;
            }
        }
        const text = `${t('cmp.status.position', { line: line.number, col })}`
            + ` · ${words === null ? t('cmp.status.words_unavailable') : t('cmp.status.words', { count: formatNumber(words) })}`
            + ` · ${t('cmp.status.chars', { count: formatNumber(chars) })}`;
        status.textContent = text;
    }

    function syncSearchState() {
        const open = searchPanelOpen(editor.state);
        bSearch.classList.toggle('cmp--btn-active', open);
        bSearch.setAttribute('aria-pressed', String(open));
    }

    function rerenderLabels() {
        translateElements(root);
        updateLangChip();
        updateProfile();
        renderToken();
        updateStatus();
        scope.frame(updateOverflow);
    }
    rerenderLabels();
    // Initial read once laid out.
    scope.frame(updateOverflow);

    const offLocale = onLocaleChange(rerenderLabels);
    function updateProfile() {
        const id = getProfile?.() || 'none';
        bProfile.classList.toggle('cmp--btn-active', id !== 'none');
        bProfile.setAttribute('aria-label', `${t('cmp.toolbar.profile')}: ${t(`cmp.profile.${id}`)}`);
        bProfile.title = bProfile.getAttribute('aria-label');
    }

    function destroy() {
        if (!scope.alive) return;
        scope.destroy();
        offLocale?.();
        try { arrowResizeObs?.disconnect(); } catch { /* ignore */ }
        arrowResizeObs = null;
        track.removeEventListener('scroll', onScroll);
        if (dialog?.classList?.contains('cmp--fullscreen')) {
            dialog.classList.remove('cmp--fullscreen');
        }
        root.remove();
    }

    return { root, status, destroy, updateStatus, updateLangChip, rerenderLabels, syncSearchState, setFullscreen, updateOverflow, updateProfile,
        invalidateTokenCount: tokenCounter.invalidate };
}

export { isMobileDevice };
