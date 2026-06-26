import { t, setLocale, detectLocale, getAvailableLocales, onLocaleChange } from './i18n.js';

const KEY = 'codeMirrorPro';

export const DEFAULTS = Object.freeze({
    // English-first default. 'auto' is an opt-in via the settings dropdown.
    locale: 'en-us',
    theme: 'auto',
    fontSize: 14,
    lineNumbers: true,
    lineWrap: true,
    highlightActiveLine: true,
    bracketMatching: true,
    closeBrackets: true,
    defaultLanguage: 'markdown',
    enabledLanguages: {
        css: true,
        markdown: true,
        html: true,
        json: true,
        javascript: true,
    },
    toolbar: { show: true, position: 'top' },
    mobileToolbar: true,
    fullscreenOnMobile: false,
    // Remember the fullscreen toggle across editors: when on, toggling fullscreen
    // persists, and new editors open in the last-used fullscreen state.
    rememberFullscreen: false,
    fullscreenState: false,
});

const LISTENERS = new Set();

function deepMerge(base, patch) {
    if (!patch || typeof patch !== 'object') return { ...base };
    const out = Array.isArray(base) ? base.slice() : { ...base };
    for (const k of Object.keys(patch)) {
        if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) {
            out[k] = deepMerge(base[k] || {}, patch[k]);
        } else if (patch[k] !== undefined) {
            out[k] = patch[k];
        }
    }
    return out;
}

function getStore() {
    try {
        const ctx = globalThis.SillyTavern?.getContext?.();
        if (ctx?.extensionSettings) return ctx.extensionSettings;
    } catch { /* ignore */ }
    return globalThis.extension_settings || (globalThis.extension_settings = {});
}

export function loadSettings() {
    const store = getStore();
    const migrated = deepMerge(DEFAULTS, store[KEY] || {});
    // 2.0.0 → 2.0.1 migration: old 'auto' default pinned non-English systems
    // to their nav locale. One-shot force to en-us (gated by _localeMigrated).
    if (!migrated._localeMigrated) {
        migrated.locale = 'en-us';
        migrated._localeMigrated = true;
    }
    store[KEY] = migrated;
    return migrated;
}

export function getSettings() {
    return loadSettings();
}

export function saveSettings(patch) {
    const store = getStore();
    const current = loadSettings();
    const next = deepMerge(current, patch || {});
    store[KEY] = next;
    try {
        const ctx = globalThis.SillyTavern?.getContext?.();
        (ctx?.saveSettingsDebounced || globalThis.saveSettingsDebounced)?.();
    } catch { /* ignore */ }
    notify(next);
    return next;
}

/** Reset all settings to DEFAULTS (preserving the migration flag). */
export function resetSettings() {
    const store = getStore();
    const reset = { ...DEFAULTS, _localeMigrated: true };
    store[KEY] = reset;
    try {
        const ctx = globalThis.SillyTavern?.getContext?.();
        (ctx?.saveSettingsDebounced || globalThis.saveSettingsDebounced)?.();
    } catch { /* ignore */ }
    notify(reset);
    return reset;
}

function notify(settings) {
    for (const fn of LISTENERS) {
        try { fn(settings); } catch (e) { console.error('[cmp] listener error', e); }
    }
}

export function onSettingsChange(fn) {
    LISTENERS.add(fn);
    return () => LISTENERS.delete(fn);
}

/* ════════════════════════════════════════════════════════════════
   Settings panel template
   Card-based layout, iOS-style toggles, font slider, theme swatches.
   All text driven by data-i18n; all controls wired by data-cmp/data-cmp-lang.
   ════════════════════════════════════════════════════════════════ */

// Theme preview swatches: [background, foreground, accent].
// Tuned to give an at-a-glance vibe of each theme in the picker.
const THEME_SWATCHES = {
    'auto':             ['var(--SmartThemeBlurTintColor, #1e1e24)', 'var(--SmartThemeBodyColor, #e6e6e6)', 'var(--SmartThemeQuoteColor, #8ab4f8)'],
    'one-dark':         ['#282c34', '#abb2bf', '#61afef'],
    'solarized-light':  ['#fdf6e3', '#657b83', '#268bd2'],
    'solarized-dark':   ['#002b36', '#839496', '#268bd2'],
    'github-light':     ['#ffffff', '#24292f', '#0969da'],
    'github-dark':      ['#0d1117', '#c9d1d9', '#58a6ff'],
    'dracula':          ['#282a36', '#f8f8f2', '#bd93f9'],
};

const THEMES = Object.keys(THEME_SWATCHES);

function iconFor(section) {
    return ({
        locale:     'fa-solid fa-language',
        appearance: 'fa-solid fa-palette',
        editor:     'fa-solid fa-code',
        languages:  'fa-solid fa-list-ul',
        toolbar:    'fa-solid fa-toolbox',
        mobile:     'fa-solid fa-mobile-screen',
        actions:    'fa-solid fa-sliders',
    })[section] || 'fa-solid fa-gear';
}

const TEMPLATE = `
<div class="cmp--settings cmp--v2 inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
        <b data-i18n="cmp.settings.title"></b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">

        <div class="cmp--settings-head">
            <div class="cmp--settings-brand">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span data-i18n="cmp.settings.subtitle"></span>
            </div>
            <button type="button" class="cmp--ghost-btn" data-cmp-action="reset" title="" data-i18n-title="cmp.settings.reset">
                <i class="fa-solid fa-rotate-left"></i>
                <span data-i18n="cmp.settings.reset"></span>
            </button>
        </div>

        <section class="cmp--card" data-section="locale">
            <header class="cmp--card-head">
                <i class="${iconFor('locale')}"></i>
                <h4 data-i18n="cmp.settings.section_locale"></h4>
            </header>
            <div class="cmp--card-body">
                <label class="cmp--row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.locale"></span>
                    <select class="cmp--select" data-cmp="locale">
                        <option value="auto" data-i18n="cmp.settings.locale_auto"></option>
                    </select>
                </label>
            </div>
        </section>

        <section class="cmp--card" data-section="appearance">
            <header class="cmp--card-head">
                <i class="${iconFor('appearance')}"></i>
                <h4 data-i18n="cmp.settings.section_appearance"></h4>
            </header>
            <div class="cmp--card-body">
                <div class="cmp--row cmp--row-stack">
                    <span class="cmp--row-label" data-i18n="cmp.settings.theme"></span>
                    <div class="cmp--theme-grid" role="radiogroup" aria-label="Theme">
                        ${THEMES.map(id => `
                            <button type="button"
                                    class="cmp--theme-swatch"
                                    role="radio"
                                    aria-checked="false"
                                    data-cmp-theme="${id}"
                                    data-i18n-title="cmp.settings.theme_${id.replace(/-/g, '_')}"
                                    title=""
                                    style="--sw-bg:${THEME_SWATCHES[id][0]};--sw-fg:${THEME_SWATCHES[id][1]};--sw-ac:${THEME_SWATCHES[id][2]};">
                                <span class="cmp--theme-preview" aria-hidden="true">
                                    <span class="cmp--theme-line cmp--theme-line-a"></span>
                                    <span class="cmp--theme-line cmp--theme-line-b"></span>
                                    <span class="cmp--theme-line cmp--theme-line-c"></span>
                                </span>
                                <span class="cmp--theme-name" data-i18n="cmp.settings.theme_${id.replace(/-/g, '_')}"></span>
                                <i class="cmp--theme-check fa-solid fa-circle-check" aria-hidden="true"></i>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="cmp--row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.font_size"></span>
                    <div class="cmp--slider-wrap">
                        <input type="range" class="cmp--slider" min="10" max="28" step="1" data-cmp="fontSize" />
                        <span class="cmp--slider-chip"><span data-cmp-out="fontSize">14</span><em>px</em></span>
                        <span class="cmp--slider-preview" data-cmp-preview="fontSize">Aa</span>
                    </div>
                </div>
            </div>
        </section>

        <section class="cmp--card" data-section="editor">
            <header class="cmp--card-head">
                <i class="${iconFor('editor')}"></i>
                <h4 data-i18n="cmp.settings.section_editor"></h4>
            </header>
            <div class="cmp--card-body cmp--toggle-list">
                <label class="cmp--toggle-row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.line_numbers"></span>
                    <span class="cmp--switch"><input type="checkbox" data-cmp="lineNumbers" /><span class="cmp--switch-track"><span class="cmp--switch-thumb"></span></span></span>
                </label>
                <label class="cmp--toggle-row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.line_wrap"></span>
                    <span class="cmp--switch"><input type="checkbox" data-cmp="lineWrap" /><span class="cmp--switch-track"><span class="cmp--switch-thumb"></span></span></span>
                </label>
                <label class="cmp--toggle-row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.highlight_active_line"></span>
                    <span class="cmp--switch"><input type="checkbox" data-cmp="highlightActiveLine" /><span class="cmp--switch-track"><span class="cmp--switch-thumb"></span></span></span>
                </label>
                <label class="cmp--toggle-row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.bracket_matching"></span>
                    <span class="cmp--switch"><input type="checkbox" data-cmp="bracketMatching" /><span class="cmp--switch-track"><span class="cmp--switch-thumb"></span></span></span>
                </label>
                <label class="cmp--toggle-row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.close_brackets"></span>
                    <span class="cmp--switch"><input type="checkbox" data-cmp="closeBrackets" /><span class="cmp--switch-track"><span class="cmp--switch-thumb"></span></span></span>
                </label>
                <label class="cmp--toggle-row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.remember_fullscreen"></span>
                    <span class="cmp--switch"><input type="checkbox" data-cmp="rememberFullscreen" /><span class="cmp--switch-track"><span class="cmp--switch-thumb"></span></span></span>
                </label>
            </div>
        </section>

        <section class="cmp--card" data-section="languages">
            <header class="cmp--card-head">
                <i class="${iconFor('languages')}"></i>
                <h4 data-i18n="cmp.settings.section_languages"></h4>
            </header>
            <div class="cmp--card-body">
                <label class="cmp--row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.default_language"></span>
                    <select class="cmp--select" data-cmp="defaultLanguage">
                        <option value="plain" data-i18n="cmp.settings.language_plain"></option>
                        <option value="markdown" data-i18n="cmp.settings.language_markdown"></option>
                        <option value="css" data-i18n="cmp.settings.language_css"></option>
                        <option value="html" data-i18n="cmp.settings.language_html"></option>
                        <option value="json" data-i18n="cmp.settings.language_json"></option>
                        <option value="javascript" data-i18n="cmp.settings.language_javascript"></option>
                    </select>
                </label>
                <div class="cmp--row cmp--row-stack">
                    <span class="cmp--row-label cmp--row-sublabel" data-i18n="cmp.settings.enabled_languages"></span>
                    <div class="cmp--chip-grid">
                        <label class="cmp--chip"><input type="checkbox" data-cmp-lang="css" /><span data-i18n="cmp.settings.language_css"></span></label>
                        <label class="cmp--chip"><input type="checkbox" data-cmp-lang="markdown" /><span data-i18n="cmp.settings.language_markdown"></span></label>
                        <label class="cmp--chip"><input type="checkbox" data-cmp-lang="html" /><span data-i18n="cmp.settings.language_html"></span></label>
                        <label class="cmp--chip"><input type="checkbox" data-cmp-lang="json" /><span data-i18n="cmp.settings.language_json"></span></label>
                        <label class="cmp--chip"><input type="checkbox" data-cmp-lang="javascript" /><span data-i18n="cmp.settings.language_javascript"></span></label>
                    </div>
                </div>
            </div>
        </section>

        <section class="cmp--card" data-section="toolbar">
            <header class="cmp--card-head">
                <i class="${iconFor('toolbar')}"></i>
                <h4 data-i18n="cmp.settings.section_toolbar"></h4>
            </header>
            <div class="cmp--card-body">
                <label class="cmp--toggle-row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.toolbar_show"></span>
                    <span class="cmp--switch"><input type="checkbox" data-cmp="toolbar.show" /><span class="cmp--switch-track"><span class="cmp--switch-thumb"></span></span></span>
                </label>
                <div class="cmp--row cmp--row-stack">
                    <span class="cmp--row-label" data-i18n="cmp.settings.toolbar_position"></span>
                    <div class="cmp--seg" role="radiogroup" aria-label="Toolbar position">
                        <button type="button" class="cmp--seg-btn" data-cmp-seg="toolbar.position" data-value="top">
                            <i class="fa-solid fa-arrow-up"></i>
                            <span data-i18n="cmp.settings.toolbar_position_top"></span>
                        </button>
                        <button type="button" class="cmp--seg-btn" data-cmp-seg="toolbar.position" data-value="bottom">
                            <i class="fa-solid fa-arrow-down"></i>
                            <span data-i18n="cmp.settings.toolbar_position_bottom"></span>
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <section class="cmp--card" data-section="mobile">
            <header class="cmp--card-head">
                <i class="${iconFor('mobile')}"></i>
                <h4 data-i18n="cmp.settings.section_mobile"></h4>
            </header>
            <div class="cmp--card-body cmp--toggle-list">
                <label class="cmp--toggle-row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.mobile_toolbar"></span>
                    <span class="cmp--switch"><input type="checkbox" data-cmp="mobileToolbar" /><span class="cmp--switch-track"><span class="cmp--switch-thumb"></span></span></span>
                </label>
                <label class="cmp--toggle-row">
                    <span class="cmp--row-label" data-i18n="cmp.settings.mobile_fullscreen"></span>
                    <span class="cmp--switch"><input type="checkbox" data-cmp="fullscreenOnMobile" /><span class="cmp--switch-track"><span class="cmp--switch-thumb"></span></span></span>
                </label>
            </div>
        </section>

    </div>
</div>
`;

function getNested(obj, path) {
    return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
}
function setNested(obj, path, val) {
    const parts = path.split('.');
    const last = parts.pop();
    let cur = obj;
    for (const p of parts) {
        if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {};
        cur = cur[p];
    }
    cur[last] = val;
}

function applyTranslations(root) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const txt = t(key);
        el.title = txt;
        el.setAttribute('aria-label', txt);
    });
}

function syncInputs(root, settings) {
    root.querySelectorAll('[data-cmp]').forEach(el => {
        const path = el.getAttribute('data-cmp');
        const val = getNested(settings, path);
        if (el.type === 'checkbox') el.checked = !!val;
        else el.value = val == null ? '' : String(val);
    });
    root.querySelectorAll('[data-cmp-lang]').forEach(el => {
        const k = el.getAttribute('data-cmp-lang');
        el.checked = !!(settings.enabledLanguages || {})[k];
    });
    // Font size slider output + preview
    const fsNum = Number(settings.fontSize) || 14;
    root.querySelectorAll('[data-cmp-out="fontSize"]').forEach(el => { el.textContent = String(fsNum); });
    root.querySelectorAll('[data-cmp-preview="fontSize"]').forEach(el => {
        el.style.fontSize = `${fsNum}px`;
    });
    // Theme swatches — reflect active selection
    const activeTheme = THEMES.includes(settings.theme) ? settings.theme : 'auto';
    root.querySelectorAll('[data-cmp-theme]').forEach(el => {
        const on = el.getAttribute('data-cmp-theme') === activeTheme;
        el.classList.toggle('cmp--theme-active', on);
        el.setAttribute('aria-checked', String(on));
    });
    // Segmented controls
    root.querySelectorAll('[data-cmp-seg]').forEach(el => {
        const path = el.getAttribute('data-cmp-seg');
        const val = el.getAttribute('data-value');
        const on = String(getNested(settings, path)) === val;
        el.classList.toggle('cmp--seg-btn-active', on);
        el.setAttribute('aria-checked', String(on));
    });
}

function populateLocaleOptions(root) {
    const sel = root.querySelector('[data-cmp="locale"]');
    if (!sel) return;
    const existing = new Set(Array.from(sel.options).map(o => o.value));
    for (const loc of getAvailableLocales()) {
        if (existing.has(loc.code)) continue;
        const opt = document.createElement('option');
        opt.value = loc.code;
        opt.textContent = loc.label;
        sel.appendChild(opt);
    }
}

export function mountSettingsPanel() {
    const host = document.getElementById('extensions_settings') || document.getElementById('extensions_settings2');
    if (!host) return null;
    if (host.querySelector('.cmp--settings')) return host.querySelector('.cmp--settings');

    const wrap = document.createElement('div');
    wrap.innerHTML = TEMPLATE.trim();
    const root = wrap.firstElementChild;
    host.appendChild(root);

    const rerender = () => {
        applyTranslations(root);
        populateLocaleOptions(root);
        syncInputs(root, getSettings());
    };
    rerender();

    // Standard change handler (checkboxes, selects, range, language chips)
    root.addEventListener('change', ev => {
        const el = ev.target;
        if (!(el instanceof HTMLElement)) return;
        const path = el.getAttribute('data-cmp');
        const lang = el.getAttribute('data-cmp-lang');
        if (path) {
            const value = el.type === 'checkbox' ? el.checked
                : (el.type === 'number' || el.type === 'range') ? Number(el.value)
                : el.value;
            const patch = {};
            setNested(patch, path, value);
            saveSettings(patch);
            if (path === 'locale') {
                setLocale(detectLocale(value));
            }
        } else if (lang) {
            saveSettings({ enabledLanguages: { [lang]: el.checked } });
        }
    });

    // Live slider feedback — update chip + preview on input (before blur)
    root.addEventListener('input', ev => {
        const el = ev.target;
        if (!(el instanceof HTMLInputElement)) return;
        if (el.type !== 'range') return;
        const path = el.getAttribute('data-cmp');
        if (!path) return;
        const v = Number(el.value);
        root.querySelectorAll(`[data-cmp-out="${path}"]`).forEach(o => { o.textContent = String(v); });
        root.querySelectorAll(`[data-cmp-preview="${path}"]`).forEach(p => { p.style.fontSize = `${v}px`; });
        // Push intermediate values so the editor responds live while dragging.
        const patch = {};
        setNested(patch, path, v);
        saveSettings(patch);
    });

    // Click-to-select theme swatches
    root.addEventListener('click', ev => {
        const target = ev.target instanceof Element ? ev.target : null;
        if (!target) return;

        const sw = target.closest('[data-cmp-theme]');
        if (sw) {
            ev.preventDefault();
            const val = sw.getAttribute('data-cmp-theme');
            saveSettings({ theme: val });
            return;
        }

        const seg = target.closest('[data-cmp-seg]');
        if (seg) {
            ev.preventDefault();
            const path = seg.getAttribute('data-cmp-seg');
            const val = seg.getAttribute('data-value');
            const patch = {};
            setNested(patch, path, val);
            saveSettings(patch);
            return;
        }

        const action = target.closest('[data-cmp-action]');
        if (action?.getAttribute('data-cmp-action') === 'reset') {
            ev.preventDefault();
            if (confirmReset()) resetSettings();
            return;
        }
    });

    // ━━━ TWO-WAY LIVE SYNC ━━━
    // Whenever settings change (from here, from quick-settings, or from any
    // other source), refresh our inputs so the two panels stay consistent.
    const offSettings = onSettingsChange(() => syncInputs(root, getSettings()));
    const offLocale = onLocaleChange(() => rerender());

    // Clean up if the drawer is ever removed
    const mo = new MutationObserver(() => {
        if (!root.isConnected) {
            offSettings?.();
            offLocale?.();
            mo.disconnect();
        }
    });
    mo.observe(host, { childList: true });

    return root;
}

function confirmReset() {
    const msg = t('cmp.settings.reset_confirm');
    try {
        // Prefer SillyTavern's popup if available, else window.confirm
        const ctx = globalThis.SillyTavern?.getContext?.();
        if (ctx?.callPopup || ctx?.Popup) {
            // Non-blocking path is async; we take the simpler synchronous confirm here
            // to avoid async plumbing in an event handler.
        }
    } catch { /* ignore */ }
    return globalThis.confirm ? globalThis.confirm(msg) : true;
}
