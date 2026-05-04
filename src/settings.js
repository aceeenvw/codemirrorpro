import { t, setLocale, detectLocale, getAvailableLocales, onLocaleChange } from './i18n.js';

const KEY = 'codeMirrorPro';

export const DEFAULTS = Object.freeze({
    // English-first by default. 'auto' available via settings dropdown.
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
    // 2.0.0→2.0.1 migration: old default 'auto' pinned non-English systems
    // to their nav locale. One-shot force to en-us via _localeMigrated flag.
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

function notify(settings) {
    for (const fn of LISTENERS) {
        try { fn(settings); } catch (e) { console.error('[cmp] listener error', e); }
    }
}

export function onSettingsChange(fn) {
    LISTENERS.add(fn);
    return () => LISTENERS.delete(fn);
}

const TEMPLATE = `
<div class="cmp--settings inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
        <b data-i18n="cmp.settings.title"></b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
        <div class="cmp--section">
            <h4 data-i18n="cmp.settings.section_locale"></h4>
            <label class="cmp--row">
                <span data-i18n="cmp.settings.locale"></span>
                <select data-cmp="locale">
                    <option value="auto" data-i18n="cmp.settings.locale_auto"></option>
                </select>
            </label>
        </div>

        <div class="cmp--section">
            <h4 data-i18n="cmp.settings.section_appearance"></h4>
            <label class="cmp--row">
                <span data-i18n="cmp.settings.theme"></span>
                <select data-cmp="theme">
                    <option value="auto" data-i18n="cmp.settings.theme_auto"></option>
                    <option value="one-dark" data-i18n="cmp.settings.theme_one_dark"></option>
                    <option value="solarized-light" data-i18n="cmp.settings.theme_solarized_light"></option>
                    <option value="solarized-dark" data-i18n="cmp.settings.theme_solarized_dark"></option>
                    <option value="github-light" data-i18n="cmp.settings.theme_github_light"></option>
                    <option value="github-dark" data-i18n="cmp.settings.theme_github_dark"></option>
                    <option value="dracula" data-i18n="cmp.settings.theme_dracula"></option>
                </select>
            </label>
            <label class="cmp--row">
                <span data-i18n="cmp.settings.font_size"></span>
                <input type="number" min="10" max="28" step="1" data-cmp="fontSize" />
            </label>
        </div>

        <div class="cmp--section">
            <h4 data-i18n="cmp.settings.section_editor"></h4>
            <label class="cmp--row cmp--check">
                <input type="checkbox" data-cmp="lineNumbers" />
                <span data-i18n="cmp.settings.line_numbers"></span>
            </label>
            <label class="cmp--row cmp--check">
                <input type="checkbox" data-cmp="lineWrap" />
                <span data-i18n="cmp.settings.line_wrap"></span>
            </label>
            <label class="cmp--row cmp--check">
                <input type="checkbox" data-cmp="highlightActiveLine" />
                <span data-i18n="cmp.settings.highlight_active_line"></span>
            </label>
            <label class="cmp--row cmp--check">
                <input type="checkbox" data-cmp="bracketMatching" />
                <span data-i18n="cmp.settings.bracket_matching"></span>
            </label>
            <label class="cmp--row cmp--check">
                <input type="checkbox" data-cmp="closeBrackets" />
                <span data-i18n="cmp.settings.close_brackets"></span>
            </label>
        </div>

        <div class="cmp--section">
            <h4 data-i18n="cmp.settings.section_languages"></h4>
            <label class="cmp--row">
                <span data-i18n="cmp.settings.default_language"></span>
                <select data-cmp="defaultLanguage">
                    <option value="plain" data-i18n="cmp.settings.language_plain"></option>
                    <option value="markdown" data-i18n="cmp.settings.language_markdown"></option>
                    <option value="css" data-i18n="cmp.settings.language_css"></option>
                    <option value="html" data-i18n="cmp.settings.language_html"></option>
                    <option value="json" data-i18n="cmp.settings.language_json"></option>
                    <option value="javascript" data-i18n="cmp.settings.language_javascript"></option>
                </select>
            </label>
            <div class="cmp--lang-grid">
                <label class="cmp--row cmp--check"><input type="checkbox" data-cmp-lang="css" /><span data-i18n="cmp.settings.language_css"></span></label>
                <label class="cmp--row cmp--check"><input type="checkbox" data-cmp-lang="markdown" /><span data-i18n="cmp.settings.language_markdown"></span></label>
                <label class="cmp--row cmp--check"><input type="checkbox" data-cmp-lang="html" /><span data-i18n="cmp.settings.language_html"></span></label>
                <label class="cmp--row cmp--check"><input type="checkbox" data-cmp-lang="json" /><span data-i18n="cmp.settings.language_json"></span></label>
                <label class="cmp--row cmp--check"><input type="checkbox" data-cmp-lang="javascript" /><span data-i18n="cmp.settings.language_javascript"></span></label>
            </div>
        </div>

        <div class="cmp--section">
            <h4 data-i18n="cmp.settings.section_toolbar"></h4>
            <label class="cmp--row cmp--check">
                <input type="checkbox" data-cmp="toolbar.show" />
                <span data-i18n="cmp.settings.toolbar_show"></span>
            </label>
            <label class="cmp--row">
                <span data-i18n="cmp.settings.toolbar_position"></span>
                <select data-cmp="toolbar.position">
                    <option value="top" data-i18n="cmp.settings.toolbar_position_top"></option>
                    <option value="bottom" data-i18n="cmp.settings.toolbar_position_bottom"></option>
                </select>
            </label>
        </div>

        <div class="cmp--section">
            <h4 data-i18n="cmp.settings.section_mobile"></h4>
            <label class="cmp--row cmp--check">
                <input type="checkbox" data-cmp="mobileToolbar" />
                <span data-i18n="cmp.settings.mobile_toolbar"></span>
            </label>
            <label class="cmp--row cmp--check">
                <input type="checkbox" data-cmp="fullscreenOnMobile" />
                <span data-i18n="cmp.settings.mobile_fullscreen"></span>
            </label>
        </div>
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
    const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
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

    root.addEventListener('change', ev => {
        const el = ev.target;
        if (!(el instanceof HTMLElement)) return;
        const path = el.getAttribute('data-cmp');
        const lang = el.getAttribute('data-cmp-lang');
        if (path) {
            const value = el.type === 'checkbox' ? el.checked
                : (el.type === 'number' ? Number(el.value) : el.value);
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

    onLocaleChange(() => rerender());

    return root;
}
