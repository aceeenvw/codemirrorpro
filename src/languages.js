// Language detection (dataset hints → content sniff → default) and
// eager-inlined CodeMirror language packs, cached on first load.

import { LANGUAGES } from './options.js';
import { warn } from './log.js';
export { LANGUAGES } from './options.js';
const CACHE = new Map();

async function load(id) {
    if (CACHE.has(id)) return CACHE.get(id);
    let mod;
    switch (id) {
        case 'css':
            mod = await import(/* webpackMode: "eager" */ '@codemirror/lang-css');
            CACHE.set(id, mod.css());
            break;
        case 'markdown':
            mod = await import(/* webpackMode: "eager" */ '@codemirror/lang-markdown');
            CACHE.set(id, mod.markdown());
            break;
        case 'html':
            mod = await import(/* webpackMode: "eager" */ '@codemirror/lang-html');
            CACHE.set(id, mod.html());
            break;
        case 'json':
            mod = await import(/* webpackMode: "eager" */ '@codemirror/lang-json');
            CACHE.set(id, mod.json());
            break;
        case 'javascript':
            mod = await import(/* webpackMode: "eager" */ '@codemirror/lang-javascript');
            CACHE.set(id, mod.javascript({ jsx: false }));
            break;
        default:
            CACHE.set(id, null);
    }
    return CACHE.get(id);
}

export function getFieldPurpose(textarea) {
    const hint = `${textarea?.dataset?.for || ''} ${textarea?.name || ''} ${textarea?.id || ''}`.toLowerCase();
    if (/customcss|custom[_-]?css|\bcss\b/.test(hint)) return 'css';
    if (/regex|stscript|slash[_-]?commands?/.test(hint)) return 'plain';
    if (/javascript|\bjs\b/.test(hint)) return 'javascript';
    if (/\bjson\b|[_-]json/.test(hint)) return 'json';
    if (/html/.test(hint)) return 'html';
    if (/desc|personality|scenario|example|first[_-]?mes|system|prompt|note|summary|greeting|character|persona|worldinfo|lorebook|entry[_-]?content/.test(hint)) return 'prose';
    return null;
}

export function detectLanguage(textarea, settings) {
    const enabled = settings?.enabledLanguages || {};
    const pick = (x) => (enabled[x] !== false ? x : null);
    const purpose = getFieldPurpose(textarea);
    if (purpose) return purpose === 'prose' ? pick('markdown') || 'plain' : pick(purpose) || 'plain';
    const sniff = sniff200(textarea?.value);
    if (sniff === 'json' && pick('json')) return 'json';
    if (sniff === 'html' && pick('html')) return 'html';
    if (sniff === 'css' && pick('css')) return 'css';
    const fallback = LANGUAGES.includes(settings?.defaultLanguage) ? settings.defaultLanguage : 'markdown';
    return pick(fallback) || 'plain';
}

function looksLikeJSON(v) {
    if (!v) return false;
    const s = v.trim();
    if (s.length > 50000 || !/^(?:\{\s*"|\[|\{\s*\})/.test(s) || s.startsWith('{{')) return false;
    try {
        const parsed = JSON.parse(s);
        return parsed !== null && typeof parsed === 'object';
    } catch { return false; }
}
function looksLikeHTML(v) {
    if (!v) return false;
    const s = v.trim();
    return /^<!doctype\s+html\b|^<html(?:\s|>)/i.test(s)
        || /^<(div|p|span|section|article|ul|table|style)\b[^>]*>[\s\S]*<\/\1>/i.test(s);
}
function sniff200(v) {
    if (!v) return null;
    const s = v.trim().slice(0, 200);
    if (!s) return null;
    if (looksLikeJSON(v)) return 'json';
    if (looksLikeHTML(v)) return 'html';
    if (/\{[\s\S]*?:[\s\S]*?;[\s\S]*?\}/.test(s) && /[.#][\w-]/.test(s)) return 'css';
    return null;
}

export async function loadLanguageExtension(id) {
    if (!LANGUAGES.includes(id) || id === 'plain') return null;
    try {
        if (!CACHE.has(id)) CACHE.set(id, load(id));
        return await CACHE.get(id);
    } catch (e) {
        warn(`language ${id}`, e);
        return null;
    }
}
