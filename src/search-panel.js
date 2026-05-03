// Custom CM6 search/replace panel. Replaces the default via search()
// config's createPanel option. Structured two-row layout, icon toggles
// for options, live match count, viewport-safe positioning, full keyboard
// control, and a mobile bottom-sheet layout.
import {
    search,
    SearchQuery,
    setSearchQuery,
    getSearchQuery,
    findNext,
    findPrevious,
    replaceNext,
    replaceAll,
    closeSearchPanel,
    SearchCursor,
    RegExpCursor,
} from '@codemirror/search';
import { t, onLocaleChange } from './i18n.js';
import { isMobileDevice } from './toolbar.js';

function countMatches(state, query) {
    if (!query.search || query.search.length === 0) return { total: 0, current: 0 };
    let total = 0;
    let current = 0;
    const sel = state.selection.main;
    try {
        if (query.regexp) {
            const flags = 'g' + (query.caseSensitive ? '' : 'i');
            const cursor = new RegExpCursor(
                state.doc,
                query.search,
                { ignoreCase: !query.caseSensitive },
                0,
                state.doc.length
            );
            while (!cursor.next().done) {
                total++;
                if (cursor.value.from === sel.from && cursor.value.to === sel.to) current = total;
            }
        } else {
            const cursor = new SearchCursor(
                state.doc,
                query.search,
                0,
                state.doc.length,
                query.caseSensitive ? undefined : (s) => s.toLowerCase()
            );
            while (!cursor.next().done) {
                total++;
                if (cursor.value.from === sel.from && cursor.value.to === sel.to) current = total;
            }
        }
    } catch { /* invalid regex */ }
    return { total, current };
}

function mkIconToggle(iconClass, titleKey, pressed, onToggle) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cmp-sp--toggle';
    b.setAttribute('aria-pressed', String(!!pressed));
    if (pressed) b.classList.add('cmp-sp--toggle-on');
    const i = document.createElement('i');
    i.className = iconClass;
    b.appendChild(i);
    b.setAttribute('data-i18n-title', titleKey);
    b.title = t(titleKey);
    b.setAttribute('aria-label', t(titleKey));
    b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !b.classList.contains('cmp-sp--toggle-on');
        b.classList.toggle('cmp-sp--toggle-on', next);
        b.setAttribute('aria-pressed', String(next));
        onToggle(next);
    });
    return b;
}

function mkBtn(label, variant, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cmp-sp--btn' + (variant ? ` cmp-sp--btn-${variant}` : '');
    b.textContent = label;
    b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
    });
    return b;
}

function mkIconBtn(iconClass, titleKey, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cmp-sp--iconbtn';
    const i = document.createElement('i');
    i.className = iconClass;
    b.appendChild(i);
    b.setAttribute('data-i18n-title', titleKey);
    b.title = t(titleKey);
    b.setAttribute('aria-label', t(titleKey));
    b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
    });
    return b;
}

// Factory for CodeMirror's createPanel hook.
export function createSearchPanel(view) {
    const dom = document.createElement('div');
    dom.className = 'cmp-sp';
    dom.setAttribute('role', 'search');
    if (isMobileDevice()) dom.classList.add('cmp-sp--mobile');

    // Initial query snapshot.
    let q = getSearchQuery(view.state);

    // ─── Row 1: Find ──────────────────────────────────────────────
    const row1 = document.createElement('div');
    row1.className = 'cmp-sp--row';

    const findWrap = document.createElement('div');
    findWrap.className = 'cmp-sp--field';

    const findInput = document.createElement('input');
    findInput.type = 'text';
    findInput.className = 'cmp-sp--input';
    findInput.setAttribute('name', 'search');
    findInput.setAttribute('data-i18n-placeholder', 'cmp.search.find_placeholder');
    findInput.placeholder = t('cmp.search.find_placeholder');
    findInput.value = q.search || '';
    findInput.spellcheck = false;
    findInput.autocomplete = 'off';
    findInput.setAttribute('aria-label', t('cmp.toolbar.search'));

    const toggles = document.createElement('div');
    toggles.className = 'cmp-sp--toggles';

    const tCase = mkIconToggle('fa-solid fa-font', 'cmp.search.match_case', q.caseSensitive, (v) => {
        q = new SearchQuery({ ...queryOpts(), caseSensitive: v });
        commit();
    });
    const tWord = mkIconToggle('fa-solid fa-w', 'cmp.search.whole_word', q.wholeWord, (v) => {
        q = new SearchQuery({ ...queryOpts(), wholeWord: v });
        commit();
    });
    const tRegex = mkIconToggle('fa-solid fa-asterisk', 'cmp.search.regex', q.regexp, (v) => {
        q = new SearchQuery({ ...queryOpts(), regexp: v });
        commit();
    });
    toggles.append(tCase, tWord, tRegex);

    const count = document.createElement('span');
    count.className = 'cmp-sp--count';

    findWrap.append(findInput, toggles, count);

    const row1Ctrls = document.createElement('div');
    row1Ctrls.className = 'cmp-sp--ctrls';

    const bPrev = mkIconBtn('fa-solid fa-chevron-up', 'cmp.search.previous', () => {
        view.focus();
        findPrevious(view);
        updateCount();
    });
    const bNext = mkIconBtn('fa-solid fa-chevron-down', 'cmp.search.next', () => {
        view.focus();
        findNext(view);
        updateCount();
    });
    const bClose = mkIconBtn('fa-solid fa-xmark', 'cmp.search.close', () => {
        closeSearchPanel(view);
    });
    bClose.classList.add('cmp-sp--close');

    row1Ctrls.append(bPrev, bNext, bClose);
    row1.append(findWrap, row1Ctrls);

    // ─── Row 2: Replace ───────────────────────────────────────────
    const row2 = document.createElement('div');
    row2.className = 'cmp-sp--row cmp-sp--row-replace';

    const replaceWrap = document.createElement('div');
    replaceWrap.className = 'cmp-sp--field';

    const replaceInput = document.createElement('input');
    replaceInput.type = 'text';
    replaceInput.className = 'cmp-sp--input';
    replaceInput.setAttribute('name', 'replace');
    replaceInput.setAttribute('data-i18n-placeholder', 'cmp.search.replace_placeholder');
    replaceInput.placeholder = t('cmp.search.replace_placeholder');
    replaceInput.value = q.replace || '';
    replaceInput.spellcheck = false;
    replaceInput.autocomplete = 'off';
    replaceInput.setAttribute('aria-label', t('cmp.toolbar.replace'));

    replaceWrap.appendChild(replaceInput);

    const row2Ctrls = document.createElement('div');
    row2Ctrls.className = 'cmp-sp--ctrls';

    const bReplace = mkBtn(t('cmp.search.replace_one'), 'secondary', () => {
        commit();
        view.focus();
        replaceNext(view);
        updateCount();
    });
    bReplace.setAttribute('data-i18n', 'cmp.search.replace_one');

    const bReplaceAll = mkBtn(t('cmp.search.replace_all'), 'primary', () => {
        commit();
        view.focus();
        replaceAll(view);
        updateCount();
    });
    bReplaceAll.setAttribute('data-i18n', 'cmp.search.replace_all');

    row2Ctrls.append(bReplace, bReplaceAll);
    row2.append(replaceWrap, row2Ctrls);

    dom.append(row1, row2);

    // ─── Helpers ──────────────────────────────────────────────────
    function queryOpts() {
        return {
            search: findInput.value,
            replace: replaceInput.value,
            caseSensitive: tCase.classList.contains('cmp-sp--toggle-on'),
            wholeWord: tWord.classList.contains('cmp-sp--toggle-on'),
            regexp: tRegex.classList.contains('cmp-sp--toggle-on'),
        };
    }

    function commit() {
        q = new SearchQuery(queryOpts());
        view.dispatch({ effects: setSearchQuery.of(q) });
    }

    function updateCount() {
        const current = getSearchQuery(view.state);
        const { total, current: cur } = countMatches(view.state, current);
        if (!current.search) {
            count.textContent = '';
            count.classList.remove('cmp-sp--count-nomatch');
            return;
        }
        if (total === 0) {
            count.textContent = t('cmp.search.no_results');
            count.classList.add('cmp-sp--count-nomatch');
        } else {
            count.textContent = cur > 0
                ? t('cmp.search.count_of', { cur, total })
                : t('cmp.search.count_total', { total });
            count.classList.remove('cmp-sp--count-nomatch');
        }
    }

    // ─── Event wiring ─────────────────────────────────────────────
    let commitTimer = null;
    findInput.addEventListener('input', () => {
        clearTimeout(commitTimer);
        commitTimer = setTimeout(() => { commit(); updateCount(); }, 80);
    });
    replaceInput.addEventListener('input', () => {
        clearTimeout(commitTimer);
        commitTimer = setTimeout(() => { commit(); }, 80);
    });

    findInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            view.focus();
            if (e.shiftKey) findPrevious(view); else findNext(view);
            updateCount();
            findInput.focus();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeSearchPanel(view);
        }
    });

    replaceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            view.focus();
            if (e.shiftKey && e.ctrlKey) replaceAll(view);
            else if (e.ctrlKey || e.metaKey) replaceAll(view);
            else replaceNext(view);
            updateCount();
            replaceInput.focus();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeSearchPanel(view);
        }
    });

    dom.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeSearchPanel(view);
        }
    });

    // Refresh count when editor selection moves (user clicks next/prev,
    // or types in document).
    const offUpdate = (update) => {
        if (update.docChanged || update.selectionSet || update.transactions.some(tr => tr.effects.some(ef => ef.is(setSearchQuery)))) {
            updateCount();
        }
    };
    const listener = { update: offUpdate };
    view.dom.addEventListener('cmp-sp-refresh', updateCount);

    // Localized labels live-update.
    const offLocale = onLocaleChange(() => {
        findInput.placeholder = t('cmp.search.find_placeholder');
        replaceInput.placeholder = t('cmp.search.replace_placeholder');
        findInput.setAttribute('aria-label', t('cmp.toolbar.search'));
        replaceInput.setAttribute('aria-label', t('cmp.toolbar.replace'));
        bReplace.textContent = t('cmp.search.replace_one');
        bReplaceAll.textContent = t('cmp.search.replace_all');
        dom.querySelectorAll('[data-i18n-title]').forEach(el => {
            const k = el.getAttribute('data-i18n-title');
            el.title = t(k);
            el.setAttribute('aria-label', t(k));
        });
        updateCount();
    });

    // Initial count render.
    setTimeout(updateCount, 0);

    return {
        dom,
        top: !isMobileDevice(), // desktop: panel docks at top; mobile: bottom sheet
        mount() {
            // rAF: focus after CM places the panel so Firefox mobile shows cursor.
            requestAnimationFrame(() => {
                findInput.focus();
                findInput.select();
            });
        },
        update(update) {
            if (update.docChanged || update.selectionSet) updateCount();
            if (update.transactions.some(tr => tr.effects.some(ef => ef.is(setSearchQuery)))) {
                const qq = getSearchQuery(update.state);
                if (qq.search !== findInput.value) findInput.value = qq.search;
                if (qq.replace !== replaceInput.value) replaceInput.value = qq.replace;
                tCase.classList.toggle('cmp-sp--toggle-on', !!qq.caseSensitive);
                tWord.classList.toggle('cmp-sp--toggle-on', !!qq.wholeWord);
                tRegex.classList.toggle('cmp-sp--toggle-on', !!qq.regexp);
                updateCount();
            }
        },
        destroy() {
            offLocale?.();
            view.dom.removeEventListener('cmp-sp-refresh', updateCount);
        },
    };
}

// Export the search extension preconfigured with our custom panel.
export const cmpSearch = () => search({ createPanel: createSearchPanel, top: true });
