import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IDEMPOTENCY_TTL_HOURS, requestHash } from '../idempotency.ts';

test('the same body hashes the same way', () => {
  assert.equal(requestHash({ amount: 100, currency: 'EUR' }), requestHash({ amount: 100, currency: 'EUR' }));
});

test('a different body hashes differently', () => {
  assert.notEqual(requestHash({ amount: 100 }), requestHash({ amount: 101 }));
});

test('keys live for 24 hours', () => {
  assert.equal(IDEMPOTENCY_TTL_HOURS, 24);
});
