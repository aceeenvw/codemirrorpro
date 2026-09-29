import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, normalizeSettings, patchSettings } from '../src/settings-model.js';
import { detectLanguage } from '../src/languages.js';
import { detectLocale } from '../src/i18n.js';

test('stored settings reject unknown keys, inherited values and invalid types', () => {
    const value = JSON.parse('{"__proto__":{"lineWrap":false},"theme":"missing","fontSize":999,"toolbar":null,"lineNumbers":"false"}');
    const result = normalizeSettings(value);
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(Object.hasOwn(result, '__proto__'), false);
    assert.equal(result.lineWrap, true);
    assert.equal(result.lineNumbers, true);
    assert.equal(result.theme, 'auto');
    assert.equal(result.fontSize, 28);
    assert.equal(result.toolbar.show, true);
    assert.equal(normalizeSettings({ lineHeight: NaN }).lineHeight, 1.5);
});

test('partial patches preserve nested settings and explicit locale preferences', () => {
    const first = patchSettings(DEFAULTS, { toolbar: { position: 'bottom' }, locale: 'ru-ru' });
    const second = patchSettings(first, { toolbar: { show: false }, enabledLanguages: { css: false } });
    assert.equal(second.toolbar.position, 'bottom');
    assert.equal(second.toolbar.show, false);
    assert.equal(second.enabledLanguages.markdown, true);
    assert.equal(second.locale, 'ru-ru');
    assert.equal(DEFAULTS.toolbar.show, true);
    assert.equal(Object.isFrozen(second.toolbar), true);
});

test('field purpose takes precedence over prompt markup and conservative content sniffing', () => {
    const field = (value, id = '') => ({ value, dataset: { for: id } });
    assert.equal(detectLanguage(field('{{char}}'), DEFAULTS), 'markdown');
    assert.equal(detectLanguage(field('[OOC: hello]'), DEFAULTS), 'markdown');
    assert.equal(detectLanguage(field('<system>instructions</system>', 'system_prompt'), DEFAULTS), 'markdown');
    assert.equal(detectLanguage(field('[[abc]]', 'regex_find'), DEFAULTS), 'plain');
    assert.equal(detectLanguage(field('body { color: red; }', 'custom_css'), DEFAULTS), 'css');
    assert.equal(detectLanguage(field('{"a":1}'), DEFAULTS), 'json');
    assert.equal(detectLanguage(field('<div>Hello</div>'), DEFAULTS), 'html');
    assert.equal(detectLanguage(field('<div>Hello</div>', 'character_description'), DEFAULTS), 'markdown');
});

test('automatic locale respects the host override and uses English for unsupported languages', () => {
    const previous = globalThis.SillyTavern;
    try {
        globalThis.SillyTavern = { getContext: () => ({ getCurrentLocale: () => 'ru-RU' }) };
        assert.equal(detectLocale('auto'), 'ru-ru');
        assert.equal(detectLocale('en-us'), 'en-us');
        globalThis.SillyTavern = { getContext: () => ({ getCurrentLocale: () => 'uk-UA' }) };
        assert.equal(detectLocale('auto'), 'en-us');
    } finally { globalThis.SillyTavern = previous; }
});
