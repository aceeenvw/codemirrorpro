import test from 'node:test';
import assert from 'node:assert/strict';
import { createTokenCounter } from '../src/token-count.js';

test('a timed-out host request stays single-flight until it finishes', async () => {
    let resolve;
    let calls = 0;
    const states = [];
    const counter = createTokenCounter({ getDoc: () => doc, timeout: 5,
        getCounter: () => () => { calls++; return new Promise(done => { resolve = done; }); },
        onState: state => states.push(state) });
    const doc = { toString: () => 'text' };
    const pending = counter.run();
    await new Promise(done => setTimeout(done, 15));
    assert.equal(states.at(-1).status, 'timeout');
    assert.equal(states.at(-1).busy, true);
    await counter.run();
    assert.equal(calls, 1);
    resolve(10);
    await pending;
    assert.equal(states.at(-1).status, 'timeout');
    assert.equal(states.at(-1).busy, false);
    counter.destroy();
});

test('token requests are on-demand, single-flight and discard stale results', async () => {
    let doc = { toString: () => 'old text' };
    let resolve;
    let calls = 0;
    const states = [];
    const counter = createTokenCounter({ getDoc: () => doc, getCounter: () => () => {
        calls++;
        return new Promise(done => { resolve = done; });
    }, onState: state => states.push(state) });
    assert.equal(calls, 0);
    const pending = counter.run();
    await counter.run();
    assert.equal(calls, 1);
    doc = { toString: () => 'new text' };
    counter.invalidate();
    resolve(123);
    await pending;
    assert.equal(states.at(-1).status, 'changed');
    assert.equal(states.at(-1).busy, false);
    counter.destroy();
});
test('closed editors receive no late token result; failures and missing APIs are explicit', async () => {
    let resolve;
    const states = [];
    const doc = { toString: () => 'text' };
    const counter = createTokenCounter({ getDoc: () => doc, getCounter: () => () => new Promise(done => { resolve = done; }), onState: state => states.push(state) });
    const pending = counter.run();
    counter.destroy();
    resolve(10);
    await pending;
    assert.equal(states.length, 1);
    const missing = createTokenCounter({ getDoc: () => doc, getCounter: () => undefined, onState: state => states.push(state) });
    await missing.run();
    assert.equal(states.at(-1).status, 'unavailable');
    missing.destroy();
    const failed = createTokenCounter({ getDoc: () => doc, getCounter: () => async () => NaN, onState: state => states.push(state) });
    await failed.run();
    assert.equal(states.at(-1).status, 'error');
    failed.destroy();
});
