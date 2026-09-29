import { LANGUAGES, THEME_IDS } from './options.js';
export const PROFILE_KEYS = Object.freeze(['lineWrap', 'lineNumbers', 'bracketMatching', 'closeBrackets', 'codeFolding', 'indentSize']);

export const DEFAULTS = Object.freeze({
    locale: 'en-us', theme: 'auto', fontSize: 14,
    lineNumbers: true, lineWrap: true, highlightActiveLine: true,
    bracketMatching: true, closeBrackets: true, indentSize: 4, lineHeight: 1.5,
    codeFolding: false, foldOnOpen: false, autocomplete: false,
    defaultLanguage: 'markdown',
    enabledLanguages: Object.freeze(Object.fromEntries(LANGUAGES.filter(id => id !== 'plain').map(id => [id, true]))),
    toolbar: Object.freeze({ show: true, position: 'top' }),
    mobileToolbar: true, fullscreenOnMobile: false,
    rememberFullscreen: false, fullscreenState: false,
    fieldProfiles: false, profileOverrides: Object.freeze([]),
});

const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const own = (value, key) => Object.hasOwn(value, key) ? value[key] : undefined;
const boolean = (value, fallback) => typeof value === 'boolean' ? value : fallback;
const number = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value)) : fallback;
const choice = (value, choices, fallback) => choices.includes(value) ? value : fallback;

export function normalizeSettings(value) {
    const input = object(value);
    const output = {};
    for (const [key, fallback] of Object.entries(DEFAULTS)) {
        if (typeof fallback === 'boolean') output[key] = boolean(own(input, key), fallback);
    }
    output.locale = choice(own(input, 'locale'), ['auto', 'en-us', 'ru-ru'], DEFAULTS.locale);
    output.theme = choice(own(input, 'theme'), THEME_IDS, DEFAULTS.theme);
    output.defaultLanguage = choice(own(input, 'defaultLanguage'), LANGUAGES, DEFAULTS.defaultLanguage);
    output.fontSize = Math.round(number(own(input, 'fontSize'), 14, 10, 28));
    output.indentSize = Math.round(number(own(input, 'indentSize'), 4, 1, 8));
    output.lineHeight = Math.round(number(own(input, 'lineHeight'), 1.5, 1, 2.4) * 10) / 10;
    const toolbar = object(own(input, 'toolbar'));
    output.toolbar = Object.freeze({
        show: boolean(own(toolbar, 'show'), true),
        position: choice(own(toolbar, 'position'), ['top', 'bottom'], 'top'),
    });
    const languages = object(own(input, 'enabledLanguages'));
    output.enabledLanguages = Object.freeze(Object.fromEntries(Object.keys(DEFAULTS.enabledLanguages)
        .map(id => [id, boolean(own(languages, id), true)])));
    const overrides = own(input, 'profileOverrides');
    output.profileOverrides = Object.freeze(Array.isArray(overrides) ? PROFILE_KEYS.filter(key => overrides.includes(key)) : []);
    return Object.freeze(output);
}

export function patchSettings(current, value) {
    const patch = object(value);
    return normalizeSettings({ ...current, ...patch,
        profileOverrides: Object.hasOwn(patch, 'profileOverrides') ? patch.profileOverrides
            : [...new Set([...current.profileOverrides, ...PROFILE_KEYS.filter(key => Object.hasOwn(patch, key))])],
        toolbar: { ...current.toolbar, ...object(own(patch, 'toolbar')) },
        enabledLanguages: { ...current.enabledLanguages, ...object(own(patch, 'enabledLanguages')) },
    });
}
