// Flat-JSON i18n. Fallback chain: active → en-us → key literal.
// {placeholder} interpolation via params object.

const EVENT = 'codemirrorpro:localechange';

let active = 'en-us';
let formatter = new Intl.NumberFormat(active);
const dicts = { 'en-us': {}, 'ru-ru': {} };

const AVAILABLE = [
    { code: 'en-us', label: 'English' },
    { code: 'ru-ru', label: 'Русский' },
];

export function registerDict(code, dict) {
    dicts[code] = dict || {};
}

function normalize(code) {
    if (!code) return null;
    const c = String(code).toLowerCase().replace('_', '-');
    if (c === 'en' || c.startsWith('en-')) return 'en-us';
    if (c === 'ru' || c.startsWith('ru-')) return 'ru-ru';
    if (AVAILABLE.some(a => a.code === c)) return c;
    return null;
}

export function detectLocale(override) {
    if (override && override !== 'auto') {
        const n = normalize(override);
        if (n) return n;
    }
    try {
        const ctx = globalThis.SillyTavern?.getContext?.();
        const stLang = ctx?.getCurrentLocale?.();
        if (stLang) return normalize(stLang) || 'en-us';
    } catch { /* ignore */ }
    const navs = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
    for (const l of navs) {
        const n = normalize(l);
        if (n) return n;
    }
    return 'en-us';
}

export function setLocale(code) {
    const next = normalize(code) || 'en-us';
    if (next === active) return active;
    active = next;
    formatter = new Intl.NumberFormat(active);
    try {
        window.dispatchEvent(new CustomEvent(EVENT, { detail: { locale: active } }));
    } catch { /* ignore */ }
    return active;
}

export function getAvailableLocales() { return AVAILABLE.slice(); }

export function ownTranslations(root) {
    for (const suffix of ['', '-title', '-placeholder']) {
        const attribute = `data-i18n${suffix}`;
        root.querySelectorAll(`[${attribute}]`).forEach(element => {
            element.setAttribute(`data-cmp-i18n${suffix}`, element.getAttribute(attribute));
            element.removeAttribute(attribute);
        });
    }
}

export function translateElements(root) {
    root.querySelectorAll('[data-cmp-i18n]').forEach(element => {
        element.textContent = t(element.getAttribute('data-cmp-i18n'));
    });
    root.querySelectorAll('[data-cmp-i18n-title]').forEach(element => {
        element.title = t(element.getAttribute('data-cmp-i18n-title'));
        element.setAttribute('aria-label', element.title);
    });
    root.querySelectorAll('input[type="range"], [role="radiogroup"]').forEach(element => {
        const row = element.closest('.cmp--row, .cmp--slider-row, .cmp--field, .cmp--card-body');
        const label = row?.querySelector('[data-cmp-i18n]');
        if (label) element.setAttribute('aria-label', label.textContent);
    });
}

export function t(key, params) {
    const d = dicts[active] || {};
    const en = dicts['en-us'] || {};
    let raw = d[key];
    if (raw == null) raw = en[key];
    if (raw == null) raw = key;
    if (!params) return raw;
    return raw.replace(/\{(\w+)\}/g, (_m, k) => (params[k] != null ? params[k] : `{${k}}`));
}

export function onLocaleChange(handler) {
    const fn = () => handler(active);
    window.addEventListener(EVENT, fn);
    return () => window.removeEventListener(EVENT, fn);
}

export function formatNumber(n) {
    try { return formatter.format(n); }
    catch { return String(n); }
}
