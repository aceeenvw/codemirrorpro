import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorState } from '@codemirror/state';
import { history, undo } from '@codemirror/commands';
import { formatSelection } from '../src/markdown.js';

function editor(doc, anchor, head = anchor) {
    const view = { state: EditorState.create({ doc, selection: { anchor, head }, extensions: [history()] }), focus() {} };
    view.dispatch = spec => { view.state = spec.state || view.state.update(spec).state; };
    return view;
}
test('formatting preserves selected text, trailing whitespace and a separate undo step', () => {
    const view = editor('hello world', 0, 6);
    formatSelection(view, '**');
    assert.equal(view.state.doc.toString(), '**hello** world');
    assert.equal(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to), 'hello');
    undo(view);
    assert.equal(view.state.doc.toString(), 'hello world');
});
test('formatting toggles existing wrappers and inserts an empty pair at the caret', () => {
    const view = editor('**hello**', 2, 7);
    formatSelection(view, '**');
    assert.equal(view.state.doc.toString(), 'hello');
    assert.equal(view.state.selection.main.to, 5);
    const empty = editor('', 0);
    formatSelection(empty, '`');
    assert.equal(empty.state.doc.toString(), '``');
    assert.equal(empty.state.selection.main.head, 1);
});
test('a caret inside a word formats that word and keeps its relative position', () => {
    const view = editor('one word here', 6);
    formatSelection(view, '*');
    assert.equal(view.state.doc.toString(), 'one *word* here');
    assert.equal(view.state.selection.main.head, 7);
    formatSelection(view, '*');
    assert.equal(view.state.doc.toString(), 'one word here');
    assert.equal(view.state.selection.main.head, 6);
    assert.equal(view.state.selection.main.empty, true);
});
