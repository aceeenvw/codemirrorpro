import test from 'node:test';
import assert from 'node:assert/strict';
import en from '../i18n/en-us.json' with { type: 'json' };
import ru from '../i18n/ru-ru.json' with { type: 'json' };

test('English and Russian provide the same labels and interpolation parameters', () => {
    assert.deepEqual(Object.keys(en).sort(), Object.keys(ru).sort());
    for (const key of Object.keys(en)) {
        assert.ok(en[key].trim() && ru[key].trim(), key);
        const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
        assert.deepEqual(placeholders(en[key]), placeholders(ru[key]), key);
    }
});
