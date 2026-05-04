// Custom CM6 search panel. Two-row layout, inline option toggles,
// live match count, full keyboard control, mobile bottom-sheet variant.
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
    if (!query.search) return { total: 0, current: 0 };
    let total = 0, current = 0;
    const sel = state.selection.main;
    try {
        const cursor = query.regexp
            ? new RegExpCursor(state.doc, query.search, { ignoreCase: !query.caseSensitive }, 0, state.doc.length)
            : new SearchCursor(state.doc, query.search, 0, state.doc.length,
                query.caseSensitive ? undefined : (s) => s.toLowerCase());
        while (!cursor.next().done) {
            total++;
            if (cursor.value.from === sel.from && cursor.value.to === sel.to) current = total;
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

export function createSearchPanel(view) {
    const dom = document.createElement('div');
    dom.className = 'cmp-sp';
    dom.setAttribute('role', 'search');
    if (isMobileDevice()) dom.classList.add('cmp-sp--mobile');

    const initialQ = getSearchQuery(view.state);

    // Row 1: find input (+ toggles + count) · prev · next · close.
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
    findInput.value = initialQ.search || '';
    findInput.spellcheck = false;
    findInput.autocomplete = 'off';
    findInput.setAttribute('aria-label', t('cmp.toolbar.search'));

    const toggles = document.createElement('div');
    toggles.className = 'cmp-sp--toggles';
    const tCase = mkIconToggle('fa-solid fa-font', 'cmp.search.match_case', initialQ.caseSensitive, commit);
    const tWord = mkIconToggle('fa-solid fa-w', 'cmp.search.whole_word', initialQ.wholeWord, commit);
    const tRegex = mkIconToggle('fa-solid fa-asterisk', 'cmp.search.regex', initialQ.regexp, commit);
    toggles.append(tCase, tWord, tRegex);

    const count = document.createElement('span');
    count.className = 'cmp-sp--count';

    findWrap.append(findInput, toggles, count);

    const row1Ctrls = document.createElement('div');
    row1Ctrls.className = 'cmp-sp--ctrls';
    const bPrev = mkIconBtn('fa-solid fa-chevron-up', 'cmp.search.previous', () => {
        commit();
        view.focus();
        findPrevious(view);
        updateCount();
    });
    const bNext = mkIconBtn('fa-solid fa-chevron-down', 'cmp.search.next', () => {
        commit();
        view.focus();
        findNext(view);
        updateCount();
    });
    const bClose = mkIconBtn('fa-solid fa-xmark', 'cmp.search.close', () => closeSearchPanel(view));
    bClose.classList.add('cmp-sp--close');
    row1Ctrls.append(bPrev, bNext, bClose);
    row1.append(findWrap, row1Ctrls);

    // Row 2: replace input · Replace · Replace-all.
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
    replaceInput.value = initialQ.replace || '';
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
        view.dispatch({ effects: setSearchQuery.of(new SearchQuery(queryOpts())) });
    }

    function updateCount() {
        const q = getSearchQuery(view.state);
        const { total, current } = countMatches(view.state, q);
        if (!q.search) {
            count.textContent = '';
            count.classList.remove('cmp-sp--count-nomatch');
            return;
        }
        if (total === 0) {
            count.textContent = t('cmp.search.no_results');
            count.classList.add('cmp-sp--count-nomatch');
        } else {
            count.textContent = current > 0
                ? t('cmp.search.count_of', { cur: current, total })
                : t('cmp.search.count_total', { total });
            count.classList.remove('cmp-sp--count-nomatch');
        }
    }

    // 80ms debounce; long queries don't thrash large documents.
    let commitTimer = null;
    const scheduleCommit = () => {
        clearTimeout(commitTimer);
        commitTimer = setTimeout(() => { commit(); updateCount(); }, 80);
    };
    findInput.addEventListener('input', scheduleCommit);
    replaceInput.addEventListener('input', scheduleCommit);

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
            if (e.ctrlKey || e.metaKey) replaceAll(view);
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

    setTimeout(updateCount, 0);

    return {
        dom,
        top: !isMobileDevice(),
        mount() {
            // rAF: focus after CM places panel (Firefox mobile cursor fix).
            requestAnimationFrame(() => {
                findInput.focus();
                findInput.select();
            });
        },
        update(update) {
            if (update.docChanged || update.selectionSet) updateCount();
            if (update.transactions.some(tr => tr.effects.some(ef => ef.is(setSearchQuery)))) {
                const q = getSearchQuery(update.state);
                if (q.search !== findInput.value) findInput.value = q.search;
                if (q.replace !== replaceInput.value) replaceInput.value = q.replace;
                tCase.classList.toggle('cmp-sp--toggle-on', !!q.caseSensitive);
                tWord.classList.toggle('cmp-sp--toggle-on', !!q.wholeWord);
                tRegex.classList.toggle('cmp-sp--toggle-on', !!q.regexp);
                updateCount();
            }
        },
        destroy() {
            clearTimeout(commitTimer);
            offLocale?.();
        },
    };
}

export const cmpSearch = () => search({ createPanel: createSearchPanel });
