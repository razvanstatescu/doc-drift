import { describe, expect, it } from 'vitest';
import { parseUnifiedDiff } from '../src/index.js';
import { codeLineHashes, hashLine, normalizeLine, removedLineHashes } from '../src/snippets.js';
import { isCosmeticOnly } from '../src/cosmetic.js';
import { fileDiff } from './helpers.js';

describe('snippet hashing', () => {
  it('normalizes whitespace and shell prompts', () => {
    expect(normalizeLine('  $ helm   rollback\tpayments 0 ')).toBe('helm rollback payments 0');
    expect(hashLine('helm rollback payments 0')).toBe(hashLine('$  helm rollback  payments 0'));
  });

  it('skips lines that are too short or have no letters', () => {
    expect(hashLine('fi')).toBeUndefined();
    expect(hashLine('  }); ')).toBeUndefined();
    expect(hashLine('12345678')).toBeUndefined();
    expect(hashLine('max: 8')).toBeDefined();
  });

  it('matches removed lines against page code, ignoring lines the change re-added', () => {
    const diffs = parseUnifiedDiff(fileDiff('values.yaml', ['  max: 8', '  min: 2'], ['  max: 12', '  min: 2']));
    const removed = removedLineHashes(diffs);
    const page = codeLineHashes(['workers:\n  min: 2\n  max: 8']);
    expect([...removed].filter((h) => page.has(h))).toHaveLength(1);
  });
});

describe('isCosmeticOnly', () => {
  const diff = (removed: string[], added: string[]) => parseUnifiedDiff(fileDiff('f', removed, added))[0]!;

  it('is true for comment edits, blank lines and reformatting', () => {
    expect(isCosmeticOnly(diff(['# Roll back to the previus release.'], ['# Roll back to the previous release.']))).toBe(true);
    expect(isCosmeticOnly(diff(['foo(a,b);'], ['foo(a, b);', '']))).toBe(true);
    expect(isCosmeticOnly(diff(['// old', ' * doc'], ['/* new */', '<!-- html -->']))).toBe(true);
  });

  it('is false for code changes, CLI flag lines, shebangs and truncated diffs', () => {
    expect(isCosmeticOnly(diff(['max: 8'], ['max: 12']))).toBe(false);
    expect(isCosmeticOnly(diff(['  --timeout 300 \\'], ['  --timeout 600 \\']))).toBe(false);
    expect(isCosmeticOnly(diff(['#!/bin/sh'], ['#!/usr/bin/env bash']))).toBe(false);
    expect(isCosmeticOnly({ path: 'f', removed: ['# a'], added: ['# b'], complete: false })).toBe(false);
    expect(isCosmeticOnly({ path: 'f', removed: [], added: [], complete: true })).toBe(false);
  });
});
