import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateChargeRequest } from '../charges.ts';

test('accepts a valid charge', () => {
  const out = validateChargeRequest({ amount: 1250, currency: 'EUR', source: 'src_4f9a' });
  assert.deepEqual(out, { amount: 1250, currency: 'EUR', source: 'src_4f9a', description: undefined });
});

test('rejects a non-integer amount', () => {
  assert.equal(validateChargeRequest({ amount: 12.5, currency: 'EUR', source: 'src_4f9a' }), 'amount_invalid');
});

test('rejects an unsupported currency', () => {
  assert.equal(validateChargeRequest({ amount: 100, currency: 'JPY', source: 'src_4f9a' }), 'currency_unsupported');
});

test('rejects a source without the src_ prefix', () => {
  assert.equal(validateChargeRequest({ amount: 100, currency: 'USD', source: 'card_1' }), 'source_invalid');
});
