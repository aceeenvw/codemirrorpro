// Flat-JSON i18n. Fallback chain: active → en-us → key literal.
// {placeholder} interpolation via params object.

const EVENT = 'codemirrorpro:localechange';

let active = 'en-us';
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
    if (c === 'ru' || c.startsWith('ru-') || c.startsWith('be-') || c === 'uk' || c.startsWith('uk-')) return 'ru-ru';
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
        const stLang = ctx?.settings?.language || ctx?.language;
        const n = normalize(stLang);
        if (n) return n;
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
    try {
        window.dispatchEvent(new CustomEvent(EVENT, { detail: { locale: active } }));
    } catch { /* ignore */ }
    return active;
}

export function getAvailableLocales() { return AVAILABLE.slice(); }

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
    try { return new Intl.NumberFormat(active).format(n); }
    catch { return String(n); }
}
