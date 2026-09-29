import test from 'node:test';
import assert from 'node:assert/strict';
import { placePopover } from '../src/popover.js';

test('popovers flip and stay inside narrow, keyboard-reduced viewports', () => {
    const viewport = { left: 0, top: 100, width: 320, height: 240 };
    const result = placePopover({ left: 290, top: 280, bottom: 324 }, { width: 260, height: 180 }, viewport);
    assert.equal(result.left, 52);
    assert.equal(result.top, 108);
    const below = placePopover({ left: 20, top: 110, bottom: 140 }, { width: 100, height: 100 }, viewport);
    assert.deepEqual(below, { left: 20, top: 146 });
});
