import test from 'node:test';
import assert from 'node:assert/strict';
import { getTheme, contrastRatio } from '../src/themes.js';
import { THEME_IDS } from '../src/options.js';

test('fixed themes keep editor text, syntax and line numbers readable on their backgrounds', () => {
    for (const id of THEME_IDS.filter(id => id !== 'auto')) {
        const { palette } = getTheme(id);
        for (const key of ['fg', 'keyword', 'name', 'function', 'constant', 'type', 'operator', 'comment', 'link', 'heading', 'atom', 'string', 'invalid']) {
            for (const background of ['bg', 'activeLine', 'panelBg']) {
                assert.ok(contrastRatio(palette[key], palette[background]) >= 4.5, `${id}: ${key} on ${background}`);
            }
        }
        assert.ok(contrastRatio(palette.gutterFg, palette.gutterBg) >= 4.5, `${id}: line numbers`);
        assert.equal(getTheme(id), getTheme(id), 'theme extensions are cached');
    }
});
