import { fail } from './log.js';

export function createScope() {
    let alive = true;
    const disposers = new Set();
    const defer = (fn) => {
        if (alive) disposers.add(fn);
        else fn();
        return () => disposers.delete(fn);
    };
    const listen = (target, type, fn, options) => {
        target.addEventListener(type, fn, options);
        defer(() => target.removeEventListener(type, fn, options));
    };
    const schedule = (request, cancel, fn, delay) => {
        let release;
        const id = request(() => {
            release?.();
            if (alive) fn();
        }, delay);
        release = defer(() => cancel(id));
        return () => { cancel(id); release(); };
    };
    return {
        get alive() { return alive; },
        defer,
        listen,
        frame: (fn) => schedule(requestAnimationFrame, cancelAnimationFrame, fn),
        timeout: (fn, ms) => schedule(setTimeout, clearTimeout, fn, ms),
        destroy() {
            if (!alive) return;
            alive = false;
            for (const fn of [...disposers].reverse()) {
                try { fn(); } catch (error) { fail('cleanup', error); }
            }
            disposers.clear();
        },
    };
}
