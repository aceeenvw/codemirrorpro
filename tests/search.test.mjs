import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorState } from '@codemirror/state';
import { SearchQuery } from '@codemirror/search';
import { createMatchCounter } from '../src/search-count.js';

test('counts use whole-word, escape, case and regexp query semantics', () => {
    const count = createMatchCounter({ budget: Infinity });
    const state = EditorState.create({ doc: 'cat concatenate CAT\ncat\tend' });
    assert.equal(count(state, new SearchQuery({ search: 'cat', wholeWord: true })).total, 3);
    assert.equal(count(state, new SearchQuery({ search: 'cat', wholeWord: true, caseSensitive: true })).total, 2);
    assert.equal(count(state, new SearchQuery({ search: '\\ncat\\t' })).total, 1);
    assert.equal(count(state, new SearchQuery({ search: 'c.t', regexp: true })).total, 4);
    assert.equal(count(state, new SearchQuery({ search: '[', regexp: true })).total, 0);
});

test('selection changes use cached matches without rescanning the document', () => {
    const count = createMatchCounter({ budget: Infinity });
    const query = new SearchQuery({ search: 'cat' });
    const getCursor = query.getCursor.bind(query);
    let scans = 0;
    query.getCursor = (...args) => { scans++; return getCursor(...args); };
    const state = EditorState.create({ doc: 'cat cat cat' });
    count(state, query);
    const selected = state.update({ selection: { anchor: 4, head: 7 } }).state;
    assert.equal(count(selected, query).current, 2);
    assert.equal(scans, 1);
    const changed = selected.update({ changes: { from: 0, to: 3, insert: 'dog' } }).state;
    assert.equal(count(changed, query).total, 2);
    assert.equal(scans, 2);
});

test('large documents and high match counts report bounded, incomplete counts', () => {
    const state = EditorState.create({ doc: 'a a a a' });
    const query = new SearchQuery({ search: 'a' });
    assert.equal(createMatchCounter({ maxLength: 3 })(state, query).skipped, true);
    const limited = createMatchCounter({ maxMatches: 2, budget: Infinity })(state, query);
    assert.equal(limited.total, 2);
    assert.equal(limited.limited, true);
});
