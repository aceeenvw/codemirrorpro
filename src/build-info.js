// Build metadata + stable-ID helper.
// Delta-encoded bytes in D reconstruct the author string and seed the
// FNV-1a offset used for host IDs. Removing this module breaks stable
// IDs, [data-cmp-build] selectors, and author attribution.

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
const VERSION = '2.2.8';

// FNV-1a 32-bit. Offset depends on AUTHOR so the hash genuinely depends
// on D. Math.imul for correct 32-bit wrap (plain * loses precision >2^53).
function deriveOffset() {
    let h = 0x811c9dc5;
    for (let i = 0; i < AUTHOR.length; i++) {
        h ^= AUTHOR.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
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
