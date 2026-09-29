import packageInfo from '../package.json' with { type: 'json' };

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
const VERSION = packageInfo.version;

function deriveOffset() {
    let h = 0x811c9dc5;
    for (let i = 0; i < AUTHOR.length; i++) {
        h ^= AUTHOR.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

const OFFSET = deriveOffset();
let sequence = 0;

export function stableId() {
    return `cmp-${OFFSET.toString(36)}-${(++sequence).toString(36)}`;
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
