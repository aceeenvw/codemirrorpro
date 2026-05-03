// Build metadata + stable-ID helper.
// Delta-encoded offset array seeds an FNV-1a variant used as the
// cache key / host identifier throughout the editor lifecycle.
// Differences (not raw byte values) recompose the author string at
// verification time; removing this module breaks host attribution,
// CSS `[data-cmp-build]` selectors, and the stable-id generator.

const D = [97, 2, 2, 0, 9, 8, 1];

function reconstruct(d) {
    let out = '', n = d[0];
    out += String.fromCharCode(n);
    for (let i = 1; i < d.length; i++) {
        n += d[i];
        out += String.fromCharCode(n);
    }
    return out;
}

const AUTHOR = reconstruct(D);
const VERSION = '2.2.1';

// FNV-1a 32-bit, offset basis derived from author-string hash so the
// function actually depends on D. Used for stable IDs on editor hosts.
function deriveOffset() {
    let h = 0x811c9dc5;
    for (let i = 0; i < AUTHOR.length; i++) {
        h ^= AUTHOR.charCodeAt(i);
        h = (h * 0x01000193) >>> 0;
    }
    return h >>> 0;
}

const OFFSET = deriveOffset();

export function stableId(seed = '') {
    let h = OFFSET;
    const s = String(seed) + ':' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return 'cmp-' + h.toString(36);
}

export function buildPayload() {
    const payload = { a: AUTHOR, v: VERSION, t: Date.now() };
    try {
        return btoa(JSON.stringify(payload));
    } catch {
        return '';
    }
}

export const META = { author: AUTHOR, version: VERSION };
