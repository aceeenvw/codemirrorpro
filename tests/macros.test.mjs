import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorState } from '@codemirror/state';
import { createMacroSource, macroStem, macroMarks, macroAllowed } from '../src/macros.js';

const target = { getAttribute: () => 'true', dataset: { macrosAutocomplete: 'always' } };
test('macro contexts handle nesting and scoped closing names without matching prose or argument text', () => {
    assert.equal(macroStem('{{if::{{us', 10).name, 'us');
    assert.equal(macroStem('{{/tr', 5).name, '/tr');
    assert.equal(macroStem('{{char}} prose', 14), null);
    assert.equal(macroStem('{{random::value', 15), null);
    assert.ok(macroMarks('{{if::{{char}}}}{{/if}}').filter(mark => mark.kind === 'name').length === 3);
});
test('host preferences control automatic and explicitly requested macro completion', () => {
    const stem = macroStem('{{u', 3);
    assert.equal(macroAllowed(target, { state: 0 }, stem, true), false);
    assert.equal(macroAllowed(target, { state: 1 }, stem, false), false);
    assert.equal(macroAllowed(target, { state: 1 }, stem, true), true);
    assert.equal(macroAllowed({ ...target, dataset: { macrosAutocomplete: 'hide' } }, {}, stem, true), false);
});
test('completion reads metadata without executing handlers and preserves existing closing braces', () => {
    const source = createMacroSource(target, () => ({ macros: { registry: { getAllMacros: () => [
        { name: 'user', description: '<b>Name</b>', handler() { throw new Error('must not execute'); } },
        { name: 'random', minArgs: 1, unnamedArgDefs: [{ name: 'value' }] },
    ] } }, powerUserSettings: { stscript: { autocomplete: { state: 2 } } } }));
    const state = EditorState.create({ doc: '{{us}}', selection: { anchor: 4 } });
    const result = source({ state, pos: 4, explicit: true });
    let next;
    result.options[0].apply({ state, dispatch: spec => { next = state.update(spec).state; } }, null, result.from, result.to);
    assert.equal(next.doc.toString(), '{{user}}');
    assert.equal(next.selection.main.head, 6);
    assert.equal(result.options[0].info, '<b>Name</b>');
    assert.equal(source({ state: EditorState.create({ doc: 'ordinary prose' }), pos: 14 }), null);
});
