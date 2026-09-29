import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, patchSettings } from '../src/settings-model.js';
import { resolveProfile, profileLanguage } from '../src/profiles.js';

test('profiles are opt-in and manual choices affect only the current editor', () => {
    const settings = normalizeSettings({});
    assert.equal(resolveProfile(settings, 'prose').closeBrackets, true);
    assert.equal(resolveProfile(settings, 'prose', 'prose').closeBrackets, false);
    assert.equal(settings.closeBrackets, true);
    assert.equal(resolveProfile({ ...settings, fieldProfiles: true }, 'css').lineWrap, false);
    assert.equal(resolveProfile({ ...settings, fieldProfiles: true }, 'css', 'none').lineWrap, true);
    assert.equal(profileLanguage(settings, 'prose', 'code', 'markdown'), 'plain');
});
test('explicit settings, including values equal to defaults, take precedence over presets', () => {
    const settings = patchSettings(normalizeSettings({ fieldProfiles: true }), { closeBrackets: true, lineNumbers: true });
    const effective = resolveProfile(settings, 'prose');
    assert.equal(effective.closeBrackets, true);
    assert.equal(effective.lineNumbers, true);
    assert.equal(effective.bracketMatching, false);
    assert.equal(resolveProfile(normalizeSettings({ fieldProfiles: true, lineWrap: false }), 'prose').lineWrap, false);
});
