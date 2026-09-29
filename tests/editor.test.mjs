import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost' });
for (const key of ['window', 'document', 'navigator', 'innerWidth', 'innerHeight', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLDialogElement', 'MutationObserver', 'ResizeObserver', 'Event', 'CustomEvent', 'DOMRect']) {
    Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true, writable: true });
}
for (const key of ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia']) globalThis[key] = window[key].bind(window);
globalThis.SillyTavern = { getContext: () => ({ extensionSettings: store, saveSettingsDebounced() {}, isMobile: () => false,
    powerUserSettings: { enable_md_hotkeys: true } }) };
const store = {};
const { setupCodeMirror } = await import('../src/editor.js');
const { loadSettings, saveSettings } = await import('../src/settings.js');
loadSettings();
after(() => window.happyDOM.abort());

function open() {
    const dialog = document.createElement('dialog');
    dialog.className = 'popup';
    const target = document.createElement('textarea');
    target.className = 'maximized_textarea';
    target.dataset.for = 'character_description';
    target.value = 'initial text';
    dialog.appendChild(target);
    document.body.appendChild(dialog);
    const handle = setupCodeMirror(target, dialog);
    assert.ok(handle, 'editor setup succeeds');
    return { dialog, target, ...handle };
}

test('editor setup is repeat-safe, synchronizes both ways and cleans up once', () => {
    const handle = open();
    const { editor, target, dialog, host, cleanup } = handle;
    assert.equal(setupCodeMirror(target, dialog), undefined);
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'from editor' } });
    assert.equal(target.value, 'from editor');
    target.value = 'external change';
    target.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(editor.state.doc.toString(), 'external change');
    let destroyed = 0;
    const destroy = editor.destroy.bind(editor);
    editor.destroy = () => { destroyed++; destroy(); };
    dialog.dispatchEvent(new Event('close'));
    cleanup();
    assert.equal(destroyed, 1);
    assert.equal(host.isConnected, false);
    assert.equal(target.classList.contains('displayNone'), false);
    dialog.remove();
});

test('language menu stays inside the dialog and Escape closes only that menu', () => {
    const { dialog, toolbar, cleanup } = open();
    toolbar.root.querySelector('.cmp--lang-chip').click();
    const menu = dialog.querySelector('.cmp--lang-menu');
    assert.ok(menu);
    assert.equal(menu.closest('dialog'), dialog);
    const event = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    menu.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(menu.isConnected, false);
    assert.equal(toolbar.root.isConnected, true);
    cleanup();
    dialog.remove();
});

test('toolbar settings apply live without rebuilding the editor', () => {
    const { editor, toolbar, host, dialog, cleanup } = open();
    saveSettings({ toolbar: { show: false, position: 'bottom' } });
    assert.equal(toolbar.root.hidden, true);
    assert.equal(toolbar.root.dataset.position, 'bottom');
    assert.equal(host.querySelector('.cm-editor'), editor.dom);
    saveSettings({ toolbar: { show: true, position: 'top' } });
    assert.equal(toolbar.root.hidden, false);
    assert.equal(host.firstElementChild, toolbar.root);
    cleanup();
    dialog.remove();
});

test('quick-settings switches and their rows toggle without dismissing the popup on focus changes', async () => {
    const { editor, dialog, toolbar, cleanup } = open();
    try {
        toolbar.root.querySelector('.cmp--btn-accent').click();
        const pop = dialog.querySelector('.cmp--quick-settings');
        const checkbox = pop.querySelector('[data-qs="lineNumbers"]');
        const before = checkbox.checked;
        checkbox.focus();
        checkbox.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true }));
        checkbox.click();
        assert.equal(checkbox.checked, !before);
        assert.equal(store.codeMirrorPro.lineNumbers, !before);
        editor.focus();
        await new Promise(resolve => setTimeout(resolve, 25));
        assert.equal(pop.isConnected, true);
        checkbox.closest('label').click();
        assert.equal(checkbox.checked, before);
        assert.equal(store.codeMirrorPro.lineNumbers, before);
        assert.equal(pop.isConnected, true);
        document.body.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true }));
        assert.equal(pop.isConnected, false, 'an actual outside press still dismisses the popup');
    } finally { cleanup(); dialog.remove(); }
});

test('host Markdown hotkeys take precedence over CodeMirror cursor commands', () => {
    const { editor, target, dialog, cleanup } = open();
    target.classList.add('mdHotkeys');
    editor.dispatch({ selection: { anchor: 0, head: 7 } });
    editor.contentDOM.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'b', code: 'KeyB', ctrlKey: true, bubbles: true, cancelable: true }));
    assert.equal(editor.state.doc.toString(), '**initial** text');
    assert.equal(target.value, '**initial** text');
    cleanup();
    dialog.remove();
});

test('failed setup restores the source and allows a clean retry', () => {
    const dialog = document.createElement('dialog');
    const target = document.createElement('textarea');
    target.value = 'preserve me';
    dialog.appendChild(target);
    document.body.appendChild(dialog);
    const observer = globalThis.ResizeObserver;
    const log = console.error;
    try {
        globalThis.ResizeObserver = class { constructor() { throw new Error('setup failure'); } };
        console.error = () => {};
        assert.equal(setupCodeMirror(target, dialog), null);
        assert.equal(target.classList.contains('displayNone'), false);
        assert.equal(dialog.querySelector('.cmp--host'), null);
        assert.equal(target.value, 'preserve me');
    } finally { globalThis.ResizeObserver = observer; console.error = log; }
    const handle = setupCodeMirror(target, dialog);
    assert.ok(handle);
    handle.cleanup();
    dialog.remove();
});
