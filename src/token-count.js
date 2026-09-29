import { createScope } from './lifecycle.js';

export function createTokenCounter({ getDoc, getCounter, onState, timeout = 30000 }) {
    const scope = createScope();
    let busy = false;
    let countedDoc;
    const emit = (status, count) => { if (scope.alive) onState({ status, count, busy }); };
    const invalidate = () => {
        if (countedDoc && countedDoc !== getDoc()) emit('changed');
    };
    const run = async () => {
        if (!scope.alive || busy) return;
        const count = getCounter();
        if (typeof count !== 'function') { emit('unavailable'); return; }
        const doc = getDoc();
        countedDoc = doc;
        busy = true;
        emit('loading');
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; emit('timeout'); }, timeout);
        const release = scope.defer(() => clearTimeout(timer));
        let status = 'ready';
        let result;
        try {
            result = await count(doc.toString());
            if (!Number.isFinite(result) || result < 0) throw new Error('Invalid token count');
        } catch { status = 'error'; }
        finally {
            clearTimeout(timer);
            release();
            busy = false;
        }
        if (!scope.alive) return;
        if (doc !== getDoc()) emit('changed');
        else emit(timedOut ? 'timeout' : status, Math.round(result));
    };
    return { run, invalidate, destroy: () => scope.destroy() };
}
