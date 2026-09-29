import test from 'node:test';
import assert from 'node:assert/strict';
import { createScope } from '../src/lifecycle.js';

test('teardown is idempotent and removes listeners and pending callbacks', async () => {
    const scope = createScope();
    const target = new EventTarget();
    let calls = 0;
    let disposals = 0;
    scope.listen(target, 'input', () => calls++);
    scope.timeout(() => calls++, 10);
    scope.defer(() => disposals++);
    target.dispatchEvent(new Event('input'));
    scope.destroy();
    scope.destroy();
    target.dispatchEvent(new Event('input'));
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(calls, 1);
    assert.equal(disposals, 1);
    assert.equal(scope.alive, false);
});

test('late ownership is disposed immediately after closing', () => {
    const scope = createScope();
    scope.destroy();
    let disposed = false;
    scope.defer(() => { disposed = true; });
    assert.equal(disposed, true);
});
