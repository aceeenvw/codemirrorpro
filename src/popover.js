import { createScope } from './lifecycle.js';

export function placePopover(anchor, size, viewport) {
    const left = Math.max(viewport.left + 8, Math.min(anchor.left, viewport.left + viewport.width - size.width - 8));
    let top = anchor.bottom + 6;
    if (top + size.height > viewport.top + viewport.height - 8) top = anchor.top - size.height - 6;
    top = Math.max(viewport.top + 8, Math.min(top, viewport.top + viewport.height - size.height - 8));
    return { left, top };
}

export function bindPopover(pop, anchor, disposers = []) {
    const scope = createScope();
    disposers.forEach(scope.defer);
    scope.defer(() => { pop.remove(); anchor.setAttribute('aria-expanded', 'false'); });
    try {
    let native = typeof pop.showPopover === 'function';
    const dialog = pop.closest('dialog');
    if (native) {
        pop.setAttribute('popover', 'manual');
        try { pop.showPopover(); }
        catch { native = false; pop.removeAttribute('popover'); }
    }
    if (!native) {
        dialog?.appendChild(pop);
        pop.style.position = 'absolute';
    }
    anchor.setAttribute('aria-haspopup', pop.getAttribute('role'));
    anchor.setAttribute('aria-expanded', 'true');
    const reposition = () => {
        const viewport = globalThis.visualViewport;
        const bounds = { left: viewport?.offsetLeft || 0, top: viewport?.offsetTop || 0,
            width: viewport?.width || innerWidth, height: viewport?.height || innerHeight };
        pop.style.maxWidth = `${Math.max(0, bounds.width - 16)}px`;
        pop.style.maxHeight = `${Math.max(0, bounds.height - 16)}px`;
        const position = placePopover(anchor.getBoundingClientRect(), { width: pop.offsetWidth, height: pop.offsetHeight }, bounds);
        const origin = !native && dialog ? dialog.getBoundingClientRect() : { left: 0, top: 0 };
        pop.style.left = `${position.left - origin.left}px`;
        pop.style.top = `${position.top - origin.top}px`;
    };
    let pending = false;
    const schedulePosition = () => {
        if (pending) return;
        pending = true;
        scope.frame(() => { pending = false; reposition(); });
    };
    scope.listen(window, 'resize', schedulePosition);
    if (globalThis.visualViewport) {
        scope.listen(visualViewport, 'resize', schedulePosition);
        scope.listen(visualViewport, 'scroll', schedulePosition);
    }
    reposition();
    const close = (restoreFocus = true) => {
        if (!scope.alive) return;
        scope.destroy();
        if (restoreFocus && anchor.isConnected) anchor.focus();
    };
    scope.listen(document, 'pointerdown', (event) => {
        if (!pop.contains(event.target) && !anchor.contains(event.target)) close(false);
    }, true);
    scope.listen(document, 'keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    }, true);
    scope.listen(pop, 'keydown', (event) => {
        const items = [...pop.querySelectorAll('button, input, select')];
        const index = items.indexOf(document.activeElement);
        let next;
        if (pop.getAttribute('role') === 'menu') {
            if (event.key === 'ArrowDown') next = (index + 1) % items.length;
            if (event.key === 'ArrowUp') next = (index + items.length - 1) % items.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = items.length - 1;
        }
        if (next !== undefined) { event.preventDefault(); items[next].focus(); }
        if (event.key === 'Tab' && pop.getAttribute('role') === 'menu') close();
    });
    if (pop.getAttribute('role') === 'menu') {
        scope.listen(pop, 'focusout', () => scope.timeout(() => {
            if (!pop.contains(document.activeElement)) close(false);
        }, 0));
    }
    pop.querySelector('button[aria-current], input, select, button')?.focus();
    Object.defineProperty(close, 'alive', { get: () => scope.alive });
    return close;
    } catch (error) {
        scope.destroy();
        throw error;
    }
}
