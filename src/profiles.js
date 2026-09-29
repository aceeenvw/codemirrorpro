import { DEFAULTS } from './settings-model.js';

const PRESETS = Object.freeze({
    prose: { lineWrap: true, lineNumbers: false, bracketMatching: false, closeBrackets: false },
    code: { lineWrap: false, lineNumbers: true, bracketMatching: true, closeBrackets: true, codeFolding: true, indentSize: 4 },
});

export function profileFor(settings, purpose, choice = 'auto') {
    if (choice === 'none') return 'none';
    if (choice === 'prose' || choice === 'code') return choice;
    if (!settings.fieldProfiles || !purpose) return 'none';
    return purpose === 'prose' ? 'prose' : 'code';
}

export function resolveProfile(settings, purpose, choice = 'auto') {
    const effective = { ...settings };
    for (const [key, value] of Object.entries(PRESETS[profileFor(settings, purpose, choice)] || {})) {
        if (!settings.profileOverrides.includes(key) && settings[key] === DEFAULTS[key]) effective[key] = value;
    }
    return effective;
}

export function profileLanguage(settings, purpose, choice, detected) {
    const profile = profileFor(settings, purpose, choice);
    if (profile === 'prose') return settings.enabledLanguages.markdown ? 'markdown' : 'plain';
    if (profile === 'code' && detected === 'markdown') return 'plain';
    return detected;
}
