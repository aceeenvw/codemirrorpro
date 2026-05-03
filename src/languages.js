// Language detection + lazy loaders. Fixes upstream bug #8:
// original only detected `customCSS`; every other field fell to plaintext.

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

export const LANGUAGES = ['plain', 'css', 'markdown', 'html', 'json', 'javascript'];

export function detectLanguage(textarea, settings) {
    const datasetFor = (textarea?.dataset?.for || '').toLowerCase();
    const name = (textarea?.name || '').toLowerCase();
    const id = (textarea?.id || '').toLowerCase();
    const hint = `${datasetFor} ${name} ${id}`;
    const enabled = settings?.enabledLanguages || {};
    const pick = (x) => (enabled[x] !== false ? x : null);

    if (/customcss|custom[_-]?css|\bcss\b/.test(hint)) return pick('css') || 'plain';
    if (/regex|script|code|\bjs\b|javascript/.test(hint)) return pick('javascript') || 'plain';
    if (/json|worldinfo|\blorebook\b|entries?\b/.test(hint) && looksLikeJSON(textarea?.value)) return pick('json') || 'plain';
    if (/html/.test(hint) || looksLikeHTML(textarea?.value)) return pick('html') || 'plain';
    if (/desc|personality|scenario|example|first[_-]?mes|system|prompt|note|summary|greeting|character|persona/.test(hint)) {
        return pick('markdown') || 'plain';
    }
    const sniff = sniff200(textarea?.value);
    if (sniff === 'json' && pick('json')) return 'json';
    if (sniff === 'html' && pick('html')) return 'html';
    if (sniff === 'css' && pick('css')) return 'css';
    return pick(settings?.defaultLanguage || 'markdown') || 'plain';
}

function looksLikeJSON(v) {
    if (!v) return false;
    const s = v.trim();
    return (s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'));
}
function looksLikeHTML(v) {
    if (!v) return false;
    const s = v.trim();
    return /^<[a-z!?][\s\S]*>/i.test(s) && /<\/?\w+/.test(s);
}
function sniff200(v) {
    if (!v) return null;
    const s = v.trim().slice(0, 200);
    if (!s) return null;
    if (s.startsWith('{') || s.startsWith('[')) return 'json';
    if (/^<[a-z!?]/i.test(s)) return 'html';
    if (/\{[\s\S]*?:[\s\S]*?;[\s\S]*?\}/.test(s) && /[.#][\w-]/.test(s)) return 'css';
    return null;
}

export async function loadLanguageExtension(id) {
    if (!id || id === 'plain') return null;
    try {
        return await load(id);
    } catch (e) {
        console.warn('[cmp] language load failed:', id, e);
        return null;
    }
}
